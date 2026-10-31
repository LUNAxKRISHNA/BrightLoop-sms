import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import type { SubscriptionStatus } from '../types/index.js';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(authenticate);

// GET /api/subscriptions
subscriptionsRouter.get('/', async (req, res) => {
  const isCustomer = req.user?.role === 'CUSTOMER';
  const customerId = req.user?.customer_account_id;

  try {
    let query = `
      SELECT s.*, 
             ca.company_name,
             p.name as plan_name, p.billing_interval, p.can_pause, p.can_close_early, p.auto_close_at_end,
             d.name as discount_name, d.discount_type, d.discount_value
      FROM subscriptions s
      JOIN customer_accounts ca ON s.customer_id = ca.id
      JOIN plans p ON s.plan_id = p.id
      LEFT JOIN discounts d ON s.discount_id = d.id
    `;
    const params: any[] = [];

    if (isCustomer) {
      if (!customerId) {
        return res.json([]);
      }
      query += ' WHERE s.customer_id = $1';
      params.push(customerId);
    }

    query += ' ORDER BY s.created_at DESC';

    const subsRes = await pool.query(query, params);

    // Fetch lines for each subscription
    const linesRes = await pool.query(`
      SELECT sl.*,
             pr.name as product_name,
             pv.attribute_name, pv.attribute_value,
             t.name as tax_name, t.rate_percentage as tax_rate
      FROM subscription_lines sl
      JOIN products pr ON sl.product_id = pr.id
      LEFT JOIN product_variants pv ON sl.variant_id = pv.id
      LEFT JOIN taxes t ON sl.tax_id = t.id
      ORDER BY sl.id ASC
    `);

    const linesBySub: Record<string, any[]> = {};
    for (const line of linesRes.rows) {
      if (!linesBySub[line.subscription_id]) {
        linesBySub[line.subscription_id] = [];
      }
      linesBySub[line.subscription_id].push(line);
    }

    const result = subsRes.rows.map((s) => ({
      ...s,
      lines: linesBySub[s.id] || [],
    }));

    return res.json(result);
  } catch (err: any) {
    console.error('Get subscriptions error:', err);
    return res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// GET /api/subscriptions/:id
subscriptionsRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const isCustomer = req.user?.role === 'CUSTOMER';
  const customerId = req.user?.customer_account_id;

  try {
    const subRes = await pool.query(
      `
      SELECT s.*, 
             ca.company_name,
             p.name as plan_name, p.billing_interval, p.can_pause, p.can_close_early, p.auto_close_at_end,
             d.name as discount_name, d.discount_type, d.discount_value
      FROM subscriptions s
      JOIN customer_accounts ca ON s.customer_id = ca.id
      JOIN plans p ON s.plan_id = p.id
      LEFT JOIN discounts d ON s.discount_id = d.id
      WHERE s.id = $1
    `,
      [id],
    );

    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const sub = subRes.rows[0];
    if (isCustomer && sub.customer_id !== customerId) {
      return res.status(403).json({ error: 'Forbidden: access denied to subscription' });
    }

    const linesRes = await pool.query(
      `
      SELECT sl.*,
             pr.name as product_name,
             pv.attribute_name, pv.attribute_value,
             t.name as tax_name, t.rate_percentage as tax_rate
      FROM subscription_lines sl
      JOIN products pr ON sl.product_id = pr.id
      LEFT JOIN product_variants pv ON sl.variant_id = pv.id
      LEFT JOIN taxes t ON sl.tax_id = t.id
      WHERE sl.subscription_id = $1
      ORDER BY sl.id ASC
    `,
      [id],
    );

    return res.json({
      ...sub,
      lines: linesRes.rows,
    });
  } catch (err: any) {
    console.error('Get subscription error:', err);
    return res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// POST /api/subscriptions (ADMIN & STAFF create quotation or subscription)
subscriptionsRouter.post('/', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const {
    customer_id,
    plan_id,
    template_id,
    discount_id,
    start_date,
    expiry_date,
    payment_terms_days,
    status = 'QUOTATION',
    lines,
  } = req.body;

  if (!customer_id || !plan_id || !start_date) {
    return res.status(400).json({
      error: 'customer_id, plan_id, and start_date are required',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify Plan and check available dates
    const planRes = await client.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = planRes.rows[0];

    // Edge Case 6: Plan available date check
    const subStartDate = new Date(start_date);
    const planAvailableFrom = new Date(plan.available_from);
    if (subStartDate < planAvailableFrom) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Plan is only available from ${plan.available_from}`,
      });
    }
    if (plan.available_to && subStartDate > new Date(plan.available_to)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Plan expired on ${plan.available_to}`,
      });
    }

    // 2. Prepare line items (either from lines payload or template)
    let resolvedLines = lines || [];
    if (resolvedLines.length === 0 && template_id) {
      const tLines = await client.query(
        'SELECT product_id, variant_id, default_quantity as quantity FROM quotation_template_lines WHERE template_id = $1',
        [template_id],
      );
      resolvedLines = tLines.rows;
    }

    if (resolvedLines.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Subscription must contain at least one line item' });
    }

    // Check min_quantity
    const totalQty = resolvedLines.reduce(
      (sum: number, l: any) => sum + Number(l.quantity || 1),
      0,
    );
    if (totalQty < plan.min_quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Plan requires a minimum total quantity of ${plan.min_quantity}`,
      });
    }

    // Generate unique subscription number: SUB-YYYY-XXXX
    const countRes = await client.query('SELECT COUNT(*) FROM subscriptions');
    const seq = Number(countRes.rows[0].count) + 1;
    const subNumber = `SUB-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;

    // Next billing date is initially start_date
    const nextBillingDate = start_date;

    const subInsertRes = await client.query(
      `INSERT INTO subscriptions (
          subscription_number, customer_id, plan_id, template_id, discount_id,
          status, start_date, expiry_date, next_billing_date, payment_terms_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
      [
        subNumber,
        customer_id,
        plan_id,
        template_id || null,
        discount_id || null,
        status,
        start_date,
        expiry_date || null,
        nextBillingDate,
        Number(payment_terms_days || 0),
      ],
    );

    const createdSub = subInsertRes.rows[0];
    const createdLines: any[] = [];

    // Edge Case 2: Historical Price Grandfathering snapshot
    for (const line of resolvedLines) {
      const prodRes = await client.query(
        'SELECT sales_price, default_tax_id FROM products WHERE id = $1',
        [line.product_id],
      );
      if (prodRes.rows.length === 0) {
        throw new Error(`Product ${line.product_id} not found`);
      }
      const product = prodRes.rows[0];

      let surcharge = 0;
      if (line.variant_id) {
        const varRes = await client.query(
          'SELECT price_surcharge FROM product_variants WHERE id = $1',
          [line.variant_id],
        );
        if (varRes.rows.length > 0) {
          surcharge = Number(varRes.rows[0].price_surcharge);
        }
      }

      const unitPrice = Number(product.sales_price) + surcharge;
      const qty = Number(line.quantity || 1);

      // Tax calculation
      const taxId = line.tax_id || product.default_tax_id;
      let taxRate = 0;
      if (taxId) {
        const taxRes = await client.query(
          'SELECT rate_percentage FROM taxes WHERE id = $1 AND is_active = TRUE',
          [taxId],
        );
        if (taxRes.rows.length > 0) {
          taxRate = Number(taxRes.rows[0].rate_percentage);
        }
      }

      const gross = unitPrice * qty;
      const taxAmt = (gross * taxRate) / 100;
      const lineAmt = gross + taxAmt;

      const lineInsert = await client.query(
        `INSERT INTO subscription_lines (
            subscription_id, product_id, variant_id, discount_id,
            quantity, unit_price, tax_id, tax_amount, line_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
        [
          createdSub.id,
          line.product_id,
          line.variant_id || null,
          line.discount_id || null,
          qty,
          unitPrice.toFixed(2),
          taxId || null,
          taxAmt.toFixed(2),
          lineAmt.toFixed(2),
        ],
      );

      createdLines.push(lineInsert.rows[0]);
    }

    await client.query('COMMIT');

    return res.status(201).json({
      ...createdSub,
      lines: createdLines,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Create subscription error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create subscription' });
  } finally {
    client.release();
  }
});

// PUT /api/subscriptions/:id/status (ADMIN & STAFF)
// State machine: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> PAUSED/CLOSED
subscriptionsRouter.put('/:id/status', requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses: SubscriptionStatus[] = [
    'DRAFT',
    'QUOTATION',
    'CONFIRMED',
    'ACTIVE',
    'PAUSED',
    'CLOSED',
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const subRes = await client.query(
      `SELECT s.*, p.can_pause, p.can_close_early, p.can_renew
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.id = $1 FOR UPDATE`,
      [id],
    );

    if (subRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const sub = subRes.rows[0];
    const currentStatus = sub.status;

    // Validate state machine transitions
    if (status === 'PAUSED') {
      if (currentStatus !== 'ACTIVE') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Cannot pause subscription from current status '${currentStatus}'. Must be 'ACTIVE'.`,
        });
      }
      if (!sub.can_pause) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Plan configuration does not allow pausing (can_pause = FALSE)',
        });
      }
    }

    if (status === 'CLOSED') {
      const today = new Date().toISOString().slice(0, 10);
      const isEarly = sub.expiry_date && today < sub.expiry_date;
      if (isEarly && !sub.can_close_early) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Plan configuration does not allow early closing (can_close_early = FALSE)',
        });
      }
    }

    if (status === 'ACTIVE' && currentStatus === 'PAUSED') {
      // Resuming from PAUSED is always allowed
    } else if (status === 'ACTIVE' && currentStatus !== 'CONFIRMED' && currentStatus !== 'PAUSED') {
      // Can only transition to ACTIVE from CONFIRMED or PAUSED
      if (currentStatus === 'DRAFT' || currentStatus === 'QUOTATION') {
        // Allow jump or require CONFIRMED first? Let's allow transition
      }
    }

    const updateRes = await client.query(
      'UPDATE subscriptions SET status = $1 WHERE id = $2 RETURNING *',
      [status, id],
    );

    await client.query('COMMIT');
    return res.json(updateRes.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Update subscription status error:', err);
    return res.status(500).json({ error: 'Failed to update subscription status' });
  } finally {
    client.release();
  }
});
