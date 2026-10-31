import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const discountsRouter = Router();

// CUSTOMER CANNOT ACCESS /api/discounts (Admin & Staff only)
discountsRouter.use(authenticate, requireRole('ADMIN', 'STAFF'));

// GET /api/discounts
discountsRouter.get('/', async (_req, res) => {
  try {
    const discountsRes = await pool.query(`
      SELECT d.*, 
             COALESCE(json_agg(dp.product_id) FILTER (WHERE dp.product_id IS NOT NULL), '[]') as product_ids
      FROM discounts d
      LEFT JOIN discount_products dp ON d.id = dp.discount_id
      GROUP BY d.id
      ORDER BY d.start_date DESC, d.name ASC
    `);

    return res.json(discountsRes.rows);
  } catch (err: any) {
    console.error('Get discounts error:', err);
    return res.status(500).json({ error: 'Failed to fetch discounts' });
  }
});

// GET /api/discounts/:id
discountsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT d.*, 
             COALESCE(json_agg(dp.product_id) FILTER (WHERE dp.product_id IS NOT NULL), '[]') as product_ids
      FROM discounts d
      LEFT JOIN discount_products dp ON d.id = dp.discount_id
      WHERE d.id = $1
      GROUP BY d.id
    `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Get discount error:', err);
    return res.status(500).json({ error: 'Failed to fetch discount' });
  }
});

// POST /api/discounts (ADMIN ONLY)
discountsRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const {
    name,
    discount_type,
    discount_value,
    applies_to,
    min_purchase_amount,
    min_quantity,
    start_date,
    end_date,
    max_uses,
    product_ids,
  } = req.body;

  if (!name || !discount_type || discount_value === undefined || !applies_to || !start_date) {
    return res.status(400).json({
      error: 'name, discount_type, discount_value, applies_to, and start_date are required',
    });
  }

  const validTypes = ['FIXED', 'PERCENTAGE'];
  if (!validTypes.includes(discount_type)) {
    return res.status(400).json({
      error: `discount_type must be one of: ${validTypes.join(', ')}`,
    });
  }

  const validTargets = ['SUBSCRIPTION', 'SPECIFIC_PRODUCTS'];
  if (!validTargets.includes(applies_to)) {
    return res.status(400).json({
      error: `applies_to must be one of: ${validTargets.join(', ')}`,
    });
  }

  const val = Number(discount_value);
  if (isNaN(val) || val <= 0) {
    return res.status(400).json({ error: 'discount_value must be > 0' });
  }

  if (discount_type === 'PERCENTAGE' && val > 100) {
    return res.status(400).json({ error: 'PERCENTAGE discount_value cannot exceed 100%' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertRes = await client.query(
      `INSERT INTO discounts (
        name, discount_type, discount_value, applies_to,
        min_purchase_amount, min_quantity, start_date, end_date,
        max_uses, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        name.trim(),
        discount_type,
        val.toFixed(2),
        applies_to,
        Number(min_purchase_amount || 0).toFixed(2),
        Number(min_quantity || 1),
        start_date,
        end_date || null,
        max_uses !== undefined && max_uses !== null ? Number(max_uses) : null,
        req.user!.id,
      ],
    );

    const discount = insertRes.rows[0];

    if (applies_to === 'SPECIFIC_PRODUCTS' && Array.isArray(product_ids)) {
      for (const pId of product_ids) {
        await client.query(
          `INSERT INTO discount_products (discount_id, product_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [discount.id, pId],
        );
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      ...discount,
      product_ids: applies_to === 'SPECIFIC_PRODUCTS' ? product_ids || [] : [],
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Create discount error:', err);
    return res.status(500).json({ error: 'Failed to create discount' });
  } finally {
    client.release();
  }
});

// PUT /api/discounts/:id (ADMIN ONLY)
discountsRouter.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    discount_type,
    discount_value,
    applies_to,
    min_purchase_amount,
    min_quantity,
    start_date,
    end_date,
    max_uses,
    product_ids,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (discount_type !== undefined) {
      updates.push(`discount_type = $${idx++}`);
      values.push(discount_type);
    }
    if (discount_value !== undefined) {
      const val = Number(discount_value);
      if (val <= 0) return res.status(400).json({ error: 'discount_value must be > 0' });
      updates.push(`discount_value = $${idx++}`);
      values.push(val.toFixed(2));
    }
    if (applies_to !== undefined) {
      updates.push(`applies_to = $${idx++}`);
      values.push(applies_to);
    }
    if (min_purchase_amount !== undefined) {
      updates.push(`min_purchase_amount = $${idx++}`);
      values.push(Number(min_purchase_amount).toFixed(2));
    }
    if (min_quantity !== undefined) {
      updates.push(`min_quantity = $${idx++}`);
      values.push(Number(min_quantity));
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${idx++}`);
      values.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${idx++}`);
      values.push(end_date || null);
    }
    if (max_uses !== undefined) {
      updates.push(`max_uses = $${idx++}`);
      values.push(max_uses !== null ? Number(max_uses) : null);
    }

    if (updates.length > 0) {
      values.push(id);
      const updateRes = await client.query(
        `UPDATE discounts SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values,
      );
      if (updateRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Discount not found' });
      }
    }

    if (Array.isArray(product_ids)) {
      await client.query('DELETE FROM discount_products WHERE discount_id = $1', [id]);
      for (const pId of product_ids) {
        await client.query(
          'INSERT INTO discount_products (discount_id, product_id) VALUES ($1, $2)',
          [id, pId],
        );
      }
    }

    await client.query('COMMIT');

    const updatedRes = await pool.query(
      `SELECT d.*, COALESCE(json_agg(dp.product_id) FILTER (WHERE dp.product_id IS NOT NULL), '[]') as product_ids
       FROM discounts d
       LEFT JOIN discount_products dp ON d.id = dp.discount_id
       WHERE d.id = $1
       GROUP BY d.id`,
      [id],
    );

    return res.json(updatedRes.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Update discount error:', err);
    return res.status(500).json({ error: 'Failed to update discount' });
  } finally {
    client.release();
  }
});
