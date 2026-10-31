import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const invoicesRouter = Router();

invoicesRouter.use(authenticate);

// GET /api/invoices
invoicesRouter.get('/', async (req, res) => {
  const isCustomer = req.user?.role === 'CUSTOMER';
  const customerId = req.user?.customer_account_id;
  const { status, subscription_id } = req.query;

  try {
    let query = `
      SELECT i.*, 
             ca.company_name,
             s.subscription_number,
             (i.total_amount - i.amount_paid) as outstanding_balance
      FROM invoices i
      JOIN customer_accounts ca ON i.customer_id = ca.id
      JOIN subscriptions s ON i.subscription_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (isCustomer) {
      if (!customerId) return res.json([]);
      query += ` AND i.customer_id = $${idx++}`;
      params.push(customerId);
    }

    if (status) {
      query += ` AND i.status = $${idx++}`;
      params.push(status);
    }

    if (subscription_id) {
      query += ` AND i.subscription_id = $${idx++}`;
      params.push(subscription_id);
    }

    query += ' ORDER BY i.issue_date DESC, i.created_at DESC';

    // Note: if created_at doesn't exist on invoices, fallback to order by issue_date DESC, invoice_number DESC
    const invoicesRes = await pool.query(query, params).catch(() => {
      const fallbackQuery = query.replace(', i.created_at DESC', ', i.invoice_number DESC');
      return pool.query(fallbackQuery, params);
    });

    return res.json(invoicesRes.rows);
  } catch (err: any) {
    console.error('Get invoices error:', err);
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id
invoicesRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const isCustomer = req.user?.role === 'CUSTOMER';
  const customerId = req.user?.customer_account_id;

  try {
    const invRes = await pool.query(
      `
      SELECT i.*, 
             ca.company_name, ca.billing_address,
             s.subscription_number,
             (i.total_amount - i.amount_paid) as outstanding_balance
      FROM invoices i
      JOIN customer_accounts ca ON i.customer_id = ca.id
      JOIN subscriptions s ON i.subscription_id = s.id
      WHERE i.id = $1
    `,
      [id],
    );

    if (invRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invRes.rows[0];
    if (isCustomer && invoice.customer_id !== customerId) {
      return res.status(403).json({ error: 'Forbidden: access denied to invoice' });
    }

    const linesRes = await pool.query(
      `
      SELECT il.*, pr.name as product_name
      FROM invoice_lines il
      JOIN products pr ON il.product_id = pr.id
      WHERE il.invoice_id = $1
      ORDER BY il.id ASC
    `,
      [id],
    );

    const paymentsRes = await pool.query(
      `
      SELECT p.*, u.email as recorded_by_email
      FROM payments p
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.invoice_id = $1
      ORDER BY p.payment_date ASC, p.created_at ASC
    `,
      [id],
    );

    return res.json({
      ...invoice,
      lines: linesRes.rows,
      payments: paymentsRes.rows,
    });
  } catch (err: any) {
    console.error('Get invoice error:', err);
    return res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// PUT /api/invoices/:id/status (ADMIN & STAFF)
invoicesRouter.put('/:id/status', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['DRAFT', 'CONFIRMED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  try {
    const invCheck = await pool.query('SELECT status, amount_paid FROM invoices WHERE id = $1', [
      id,
    ]);
    if (invCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const currentStatus = invCheck.rows[0].status;
    if (currentStatus === 'PAID') {
      return res.status(400).json({ error: 'PAID invoices cannot be modified or cancelled' });
    }

    if (status === 'CANCELLED' && Number(invCheck.rows[0].amount_paid) > 0) {
      return res.status(400).json({
        error: 'Cannot cancel an invoice with recorded payments',
      });
    }

    const updateRes = await pool.query(
      'UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
    );

    return res.json(updateRes.rows[0]);
  } catch (err: any) {
    console.error('Update invoice status error:', err);
    return res.status(500).json({ error: 'Failed to update invoice status' });
  }
});
