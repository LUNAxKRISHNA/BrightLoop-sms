import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

// GET /api/payments
paymentsRouter.get('/', async (req, res) => {
  const isCustomer = req.user?.role === 'CUSTOMER';
  const customerId = req.user?.customer_account_id;

  try {
    let query = `
      SELECT p.*, 
             i.invoice_number, i.total_amount, i.amount_paid as invoice_amount_paid,
             ca.company_name,
             u.email as recorded_by_email
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customer_accounts ca ON i.customer_id = ca.id
      LEFT JOIN users u ON p.recorded_by = u.id
    `;
    const params: any[] = [];

    if (isCustomer) {
      if (!customerId) return res.json([]);
      query += ' WHERE i.customer_id = $1';
      params.push(customerId);
    }

    query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err: any) {
    console.error('Get payments error:', err);
    return res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /api/payments (ADMIN & STAFF)
paymentsRouter.post('/', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const { invoice_id, payment_method, amount, payment_date, notes } = req.body;

  if (!invoice_id || !payment_method || amount === undefined) {
    return res.status(400).json({
      error: 'invoice_id, payment_method, and amount are required',
    });
  }

  const validMethods = ['BANK_TRANSFER', 'CREDIT_CARD', 'UPI', 'CASH', 'OTHER'];
  if (!validMethods.includes(payment_method)) {
    return res.status(400).json({
      error: `payment_method must be one of: ${validMethods.join(', ')}`,
    });
  }

  const payAmount = Number(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const payDate = payment_date || new Date().toISOString().slice(0, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch invoice for update
    const invRes = await client.query('SELECT * FROM invoices WHERE id = $1 FOR UPDATE', [
      invoice_id,
    ]);

    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const inv = invRes.rows[0];

    if (inv.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot record payment for a CANCELLED invoice' });
    }

    if (inv.status === 'PAID') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invoice is already fully PAID' });
    }

    const currentPaid = Number(inv.amount_paid);
    const total = Number(inv.total_amount);
    const remainingBalance = total - currentPaid;

    if (payAmount > remainingBalance + 0.001) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Payment amount (${payAmount.toFixed(2)}) exceeds remaining balance (${remainingBalance.toFixed(2)})`,
      });
    }

    // Insert payment record
    const payInsertRes = await client.query(
      `INSERT INTO payments (
          invoice_id, payment_method, amount, payment_date, notes, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
      [invoice_id, payment_method, payAmount.toFixed(2), payDate, notes || null, req.user!.id],
    );

    // Edge Case 5: Atomic update to invoice amount_paid and status
    const updatedInvRes = await client.query(
      `UPDATE invoices
         SET amount_paid = amount_paid + $1,
             status = CASE 
                        WHEN (amount_paid + $1) >= total_amount THEN 'PAID'::invoice_status 
                        ELSE status 
                      END
         WHERE id = $2
         RETURNING *`,
      [payAmount.toFixed(2), invoice_id],
    );

    await client.query('COMMIT');

    return res.status(201).json({
      payment: payInsertRes.rows[0],
      invoice: updatedInvRes.rows[0],
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Record payment error:', err);
    return res.status(500).json({ error: 'Failed to record payment' });
  } finally {
    client.release();
  }
});
