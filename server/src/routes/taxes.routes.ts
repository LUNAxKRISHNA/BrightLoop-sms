import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const taxesRouter = Router();

// GET /api/taxes
taxesRouter.get('/', authenticate, async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, rate_percentage, is_active, created_by FROM taxes ORDER BY name ASC',
    );
    return res.json(result.rows);
  } catch (err: any) {
    console.error('Get taxes error:', err);
    return res.status(500).json({ error: 'Failed to fetch taxes' });
  }
});

// POST /api/taxes (ADMIN ONLY)
taxesRouter.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { name, rate_percentage } = req.body;
  if (!name || rate_percentage === undefined) {
    return res.status(400).json({ error: 'Name and rate_percentage are required' });
  }

  const rate = Number(rate_percentage);
  if (isNaN(rate) || rate < 0) {
    return res.status(400).json({ error: 'rate_percentage must be a non-negative number' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO taxes (name, rate_percentage, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, rate_percentage, is_active, created_by`,
      [name.trim(), rate.toFixed(2), req.user!.id],
    );
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Create tax error:', err);
    return res.status(500).json({ error: 'Failed to create tax' });
  }
});

// PUT /api/taxes/:id (ADMIN ONLY)
taxesRouter.put('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, rate_percentage, is_active } = req.body;

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (rate_percentage !== undefined) {
      const rate = Number(rate_percentage);
      if (isNaN(rate) || rate < 0) {
        return res.status(400).json({ error: 'rate_percentage must be >= 0' });
      }
      updates.push(`rate_percentage = $${idx++}`);
      values.push(rate.toFixed(2));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(Boolean(is_active));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE taxes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax not found' });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Update tax error:', err);
    return res.status(500).json({ error: 'Failed to update tax' });
  }
});
