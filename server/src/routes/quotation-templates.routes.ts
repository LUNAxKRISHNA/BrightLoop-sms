import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const quotationTemplatesRouter = Router();

quotationTemplatesRouter.use(authenticate);

// GET /api/quotation-templates
quotationTemplatesRouter.get('/', async (_req, res) => {
  try {
    const templatesRes = await pool.query(`
      SELECT qt.*, p.name as plan_name, p.billing_interval
      FROM quotation_templates qt
      JOIN plans p ON qt.plan_id = p.id
      ORDER BY qt.name ASC
    `);

    const linesRes = await pool.query(`
      SELECT qtl.*, pr.name as product_name, pr.sales_price,
             pv.attribute_name, pv.attribute_value, pv.price_surcharge
      FROM quotation_template_lines qtl
      JOIN products pr ON qtl.product_id = pr.id
      LEFT JOIN product_variants pv ON qtl.variant_id = pv.id
      ORDER BY qtl.id ASC
    `);

    const linesByTemplate: Record<string, any[]> = {};
    for (const line of linesRes.rows) {
      if (!linesByTemplate[line.template_id]) {
        linesByTemplate[line.template_id] = [];
      }
      linesByTemplate[line.template_id].push(line);
    }

    const result = templatesRes.rows.map((t) => ({
      ...t,
      lines: linesByTemplate[t.id] || [],
    }));

    return res.json(result);
  } catch (err: any) {
    console.error('Get templates error:', err);
    return res.status(500).json({ error: 'Failed to fetch quotation templates' });
  }
});

// POST /api/quotation-templates (ADMIN & STAFF)
quotationTemplatesRouter.post('/', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const { name, plan_id, validity_days, lines } = req.body;

  if (!name || !plan_id || !validity_days) {
    return res.status(400).json({
      error: 'name, plan_id, and validity_days are required',
    });
  }

  const validity = Number(validity_days);
  if (isNaN(validity) || validity <= 0) {
    return res.status(400).json({ error: 'validity_days must be > 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const templateRes = await client.query(
      `INSERT INTO quotation_templates (name, plan_id, validity_days)
         VALUES ($1, $2, $3)
         RETURNING *`,
      [name.trim(), plan_id, validity],
    );

    const template = templateRes.rows[0];
    const createdLines: any[] = [];

    if (Array.isArray(lines)) {
      for (const line of lines) {
        if (line.product_id) {
          const qty = Number(line.default_quantity || 1);
          const lineRes = await client.query(
            `INSERT INTO quotation_template_lines (template_id, product_id, variant_id, default_quantity)
               VALUES ($1, $2, $3, $4)
               RETURNING *`,
            [template.id, line.product_id, line.variant_id || null, qty],
          );
          createdLines.push(lineRes.rows[0]);
        }
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      ...template,
      lines: createdLines,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Create template error:', err);
    return res.status(500).json({ error: 'Failed to create quotation template' });
  } finally {
    client.release();
  }
});
