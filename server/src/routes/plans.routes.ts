import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const plansRouter = Router();

// GET /api/plans
plansRouter.get('/', authenticate, async (_req, res) => {
  try {
    const result = await pool
      .query('SELECT * FROM plans ORDER BY created_at DESC, name ASC')
      .catch(() => {
        // In case created_at is not on plans
        return pool.query('SELECT * FROM plans ORDER BY name ASC');
      });
    return res.json(result.rows);
  } catch (err: any) {
    console.error('Get plans error:', err);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// GET /api/plans/:id
plansRouter.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM plans WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Get plan error:', err);
    return res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// POST /api/plans (ADMIN ONLY)
plansRouter.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  const {
    name,
    base_price,
    billing_interval,
    min_quantity,
    available_from,
    available_to,
    auto_close_at_end,
    can_close_early,
    can_pause,
    can_renew,
  } = req.body;

  if (!name || !billing_interval || !available_from) {
    return res.status(400).json({
      error: 'name, billing_interval, and available_from are required',
    });
  }

  const validIntervals = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];
  if (!validIntervals.includes(billing_interval)) {
    return res.status(400).json({
      error: `Invalid billing_interval. Must be one of: ${validIntervals.join(', ')}`,
    });
  }

  const basePriceNum = Number(base_price || 0);
  const minQtyNum = Number(min_quantity || 1);

  if (basePriceNum < 0 || minQtyNum < 1) {
    return res.status(400).json({
      error: 'base_price must be >= 0 and min_quantity must be >= 1',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO plans (
        name, base_price, billing_interval, min_quantity,
        available_from, available_to, auto_close_at_end,
        can_close_early, can_pause, can_renew
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        name.trim(),
        basePriceNum.toFixed(2),
        billing_interval,
        minQtyNum,
        available_from,
        available_to || null,
        Boolean(auto_close_at_end),
        Boolean(can_close_early),
        Boolean(can_pause),
        can_renew !== undefined ? Boolean(can_renew) : true,
      ],
    );

    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Create plan error:', err);
    return res.status(500).json({ error: 'Failed to create plan' });
  }
});

// PUT /api/plans/:id (ADMIN ONLY)
plansRouter.put('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    base_price,
    billing_interval,
    min_quantity,
    available_from,
    available_to,
    auto_close_at_end,
    can_close_early,
    can_pause,
    can_renew,
  } = req.body;

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (base_price !== undefined) {
      const p = Number(base_price);
      if (p < 0) return res.status(400).json({ error: 'base_price must be >= 0' });
      updates.push(`base_price = $${idx++}`);
      values.push(p.toFixed(2));
    }
    if (billing_interval !== undefined) {
      updates.push(`billing_interval = $${idx++}`);
      values.push(billing_interval);
    }
    if (min_quantity !== undefined) {
      const q = Number(min_quantity);
      if (q < 1) return res.status(400).json({ error: 'min_quantity must be >= 1' });
      updates.push(`min_quantity = $${idx++}`);
      values.push(q);
    }
    if (available_from !== undefined) {
      updates.push(`available_from = $${idx++}`);
      values.push(available_from);
    }
    if (available_to !== undefined) {
      updates.push(`available_to = $${idx++}`);
      values.push(available_to || null);
    }
    if (auto_close_at_end !== undefined) {
      updates.push(`auto_close_at_end = $${idx++}`);
      values.push(Boolean(auto_close_at_end));
    }
    if (can_close_early !== undefined) {
      updates.push(`can_close_early = $${idx++}`);
      values.push(Boolean(can_close_early));
    }
    if (can_pause !== undefined) {
      updates.push(`can_pause = $${idx++}`);
      values.push(Boolean(can_pause));
    }
    if (can_renew !== undefined) {
      updates.push(`can_renew = $${idx++}`);
      values.push(Boolean(can_renew));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE plans SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Update plan error:', err);
    return res.status(500).json({ error: 'Failed to update plan' });
  }
});
