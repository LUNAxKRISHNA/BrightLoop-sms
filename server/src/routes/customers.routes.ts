import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

export const customersRouter = Router();

customersRouter.use(authenticate);

// GET /api/customers
customersRouter.get('/', async (req, res) => {
  try {
    let query = `
      SELECT ca.id, ca.user_id, ca.company_name, ca.billing_address, ca.created_at,
             u.email
      FROM customer_accounts ca
      JOIN users u ON ca.user_id = u.id
    `;
    const params: any[] = [];

    if (req.user?.role === 'CUSTOMER') {
      query += ' WHERE ca.user_id = $1';
      params.push(req.user.id);
    } else {
      query += ' ORDER BY ca.company_name ASC';
    }

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err: any) {
    console.error('Get customers error:', err);
    return res.status(500).json({ error: 'Failed to fetch customer accounts' });
  }
});

// GET /api/customers/:id
customersRouter.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (req.user?.role === 'CUSTOMER' && req.user.customer_account_id !== id) {
      return res.status(403).json({ error: 'Forbidden: access to other customer account denied' });
    }

    const result = await pool.query(
      `
      SELECT ca.id, ca.user_id, ca.company_name, ca.billing_address, ca.created_at,
             u.email
      FROM customer_accounts ca
      JOIN users u ON ca.user_id = u.id
      WHERE ca.id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer account not found' });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Get customer error:', err);
    return res.status(500).json({ error: 'Failed to fetch customer account' });
  }
});

// PUT /api/customers/:id
customersRouter.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { company_name, billing_address } = req.body;

  if (req.user?.role === 'CUSTOMER' && req.user.customer_account_id !== id) {
    return res.status(403).json({ error: 'Forbidden: cannot update other customer accounts' });
  }

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (company_name !== undefined) {
      updates.push(`company_name = $${idx++}`);
      values.push(company_name.trim());
    }
    if (billing_address !== undefined) {
      updates.push(`billing_address = $${idx++}`);
      values.push(billing_address ? billing_address.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE customer_accounts SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer account not found' });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Update customer error:', err);
    return res.status(500).json({ error: 'Failed to update customer account' });
  }
});
