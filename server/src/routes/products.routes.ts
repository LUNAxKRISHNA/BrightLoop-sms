import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const productsRouter = Router();

// GET /api/products
productsRouter.get('/', authenticate, async (req, res) => {
  const isCustomer = req.user?.role === 'CUSTOMER';

  try {
    const productsRes = await pool.query(`
      SELECT p.id, p.name, p.product_type, p.sales_price,
             ${isCustomer ? 'NULL as cost_price, NULL as notes,' : 'p.cost_price, p.notes,'}
             p.default_tax_id, p.is_active,
             t.name as tax_name, t.rate_percentage as tax_rate
      FROM products p
      LEFT JOIN taxes t ON p.default_tax_id = t.id
      ORDER BY p.name ASC
    `);

    const variantsRes = await pool.query(`
      SELECT id, product_id, attribute_name, attribute_value, price_surcharge
      FROM product_variants
      ORDER BY attribute_name ASC, attribute_value ASC
    `);

    const variantsByProduct: Record<string, any[]> = {};
    for (const v of variantsRes.rows) {
      if (!variantsByProduct[v.product_id]) {
        variantsByProduct[v.product_id] = [];
      }
      variantsByProduct[v.product_id].push(v);
    }

    const result = productsRes.rows.map((p) => ({
      ...p,
      variants: variantsByProduct[p.id] || [],
    }));

    return res.json(result);
  } catch (err: any) {
    console.error('Get products error:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
productsRouter.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const isCustomer = req.user?.role === 'CUSTOMER';

  try {
    const prodRes = await pool.query(
      `
      SELECT p.id, p.name, p.product_type, p.sales_price,
             ${isCustomer ? 'NULL as cost_price, NULL as notes,' : 'p.cost_price, p.notes,'}
             p.default_tax_id, p.is_active,
             t.name as tax_name, t.rate_percentage as tax_rate
      FROM products p
      LEFT JOIN taxes t ON p.default_tax_id = t.id
      WHERE p.id = $1
    `,
      [id],
    );

    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const variantsRes = await pool.query(
      'SELECT id, product_id, attribute_name, attribute_value, price_surcharge FROM product_variants WHERE product_id = $1',
      [id],
    );

    return res.json({
      ...prodRes.rows[0],
      variants: variantsRes.rows,
    });
  } catch (err: any) {
    console.error('Get product error:', err);
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products (ADMIN ONLY)
productsRouter.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { name, product_type, sales_price, cost_price, default_tax_id, notes, variants } = req.body;

  if (!name || !product_type || sales_price === undefined || cost_price === undefined) {
    return res.status(400).json({
      error: 'name, product_type, sales_price, and cost_price are required',
    });
  }

  const validTypes = ['SOFTWARE', 'ADD_ON', 'SERVICE'];
  if (!validTypes.includes(product_type)) {
    return res.status(400).json({
      error: `Invalid product_type. Must be one of: ${validTypes.join(', ')}`,
    });
  }

  const sales = Number(sales_price);
  const cost = Number(cost_price);
  if (isNaN(sales) || sales < 0 || isNaN(cost) || cost < 0) {
    return res.status(400).json({ error: 'sales_price and cost_price must be >= 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertProd = await client.query(
      `INSERT INTO products (name, product_type, sales_price, cost_price, default_tax_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name.trim(),
        product_type,
        sales.toFixed(2),
        cost.toFixed(2),
        default_tax_id || null,
        notes || null,
      ],
    );

    const product = insertProd.rows[0];
    const createdVariants: any[] = [];

    if (Array.isArray(variants)) {
      for (const v of variants) {
        if (v.attribute_name && v.attribute_value) {
          const surcharge = Number(v.price_surcharge || 0);
          const vRes = await client.query(
            `INSERT INTO product_variants (product_id, attribute_name, attribute_value, price_surcharge)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [product.id, v.attribute_name.trim(), v.attribute_value.trim(), surcharge.toFixed(2)],
          );
          createdVariants.push(vRes.rows[0]);
        }
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      ...product,
      variants: createdVariants,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Create product error:', err);
    return res.status(500).json({ error: 'Failed to create product' });
  } finally {
    client.release();
  }
});

// PUT /api/products/:id (ADMIN ONLY)
productsRouter.put('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, product_type, sales_price, cost_price, default_tax_id, notes, is_active } =
    req.body;

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (product_type !== undefined) {
      updates.push(`product_type = $${idx++}`);
      values.push(product_type);
    }
    if (sales_price !== undefined) {
      const sales = Number(sales_price);
      if (isNaN(sales) || sales < 0) {
        return res.status(400).json({ error: 'sales_price must be >= 0' });
      }
      updates.push(`sales_price = $${idx++}`);
      values.push(sales.toFixed(2));
    }
    if (cost_price !== undefined) {
      const cost = Number(cost_price);
      if (isNaN(cost) || cost < 0) {
        return res.status(400).json({ error: 'cost_price must be >= 0' });
      }
      updates.push(`cost_price = $${idx++}`);
      values.push(cost.toFixed(2));
    }
    if (default_tax_id !== undefined) {
      updates.push(`default_tax_id = $${idx++}`);
      values.push(default_tax_id || null);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      values.push(notes || null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(Boolean(is_active));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Update product error:', err);
    return res.status(500).json({ error: 'Failed to update product' });
  }
});

// POST /api/products/:id/variants (ADMIN ONLY)
productsRouter.post('/:id/variants', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { attribute_name, attribute_value, price_surcharge } = req.body;

  if (!attribute_name || !attribute_value) {
    return res.status(400).json({
      error: 'attribute_name and attribute_value are required',
    });
  }

  const surcharge = Number(price_surcharge || 0);
  if (isNaN(surcharge)) {
    return res.status(400).json({ error: 'price_surcharge must be a valid number' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO product_variants (product_id, attribute_name, attribute_value, price_surcharge)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
      [id, attribute_name.trim(), attribute_value.trim(), surcharge.toFixed(2)],
    );

    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Create variant error:', err);
    return res.status(500).json({ error: 'Failed to create variant' });
  }
});

// DELETE /api/products/variants/:variantId (ADMIN ONLY)
productsRouter.delete(
  '/variants/:variantId',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    const { variantId } = req.params;
    try {
      const result = await pool.query('DELETE FROM product_variants WHERE id = $1 RETURNING id', [
        variantId,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Variant not found' });
      }
      return res.json({ message: 'Variant deleted successfully' });
    } catch (err: any) {
      console.error('Delete variant error:', err);
      return res.status(500).json({ error: 'Failed to delete variant' });
    }
  },
);
