import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const billingRouter = Router();

billingRouter.use(authenticate, requireRole('ADMIN', 'STAFF'));

// Helper to advance date by billing interval
function advanceBillingDate(dateStr: string, interval: string): string {
  const d = new Date(dateStr);
  switch (interval) {
    case 'DAILY':
      d.setDate(d.getDate() + 1);
      break;
    case 'WEEKLY':
      d.setDate(d.getDate() + 7);
      break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

// POST /api/billing/run
billingRouter.post('/run', async (req, res) => {
  const targetDate = req.body.target_date || new Date().toISOString().slice(0, 10);

  const client = await pool.connect();
  let generatedCount = 0;
  let skippedCount = 0;
  let autoClosedCount = 0;
  const createdInvoices: any[] = [];

  try {
    // 1. Fetch all ACTIVE subscriptions due for billing on or before targetDate
    // Use SELECT ... FOR UPDATE SKIP LOCKED
    await client.query('BEGIN');

    const dueSubsRes = await client.query(
      `
      SELECT s.*, 
             p.billing_interval, p.auto_close_at_end, p.can_renew
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'ACTIVE' 
        AND s.next_billing_date <= $1
      ORDER BY s.next_billing_date ASC
      FOR UPDATE OF s SKIP LOCKED
    `,
      [targetDate],
    );

    for (const sub of dueSubsRes.rows) {
      // Edge Case 6: Auto-close check
      if (sub.auto_close_at_end && sub.expiry_date && targetDate >= sub.expiry_date) {
        await client.query("UPDATE subscriptions SET status = 'CLOSED' WHERE id = $1", [sub.id]);
        autoClosedCount++;
        continue;
      }

      const periodStart = sub.next_billing_date;
      const periodEnd = advanceBillingDate(periodStart, sub.billing_interval);

      // Edge Case 1: Check if invoice already exists for this exact cycle (idempotency check)
      const existingInv = await client.query(
        `SELECT id FROM invoices 
         WHERE subscription_id = $1 
           AND billing_period_start = $2 
           AND billing_period_end = $3 
           AND status != 'CANCELLED'`,
        [sub.id, periodStart, periodEnd],
      );

      if (existingInv.rows.length > 0) {
        skippedCount++;
        // Advance next_billing_date so it won't pick up again
        await client.query('UPDATE subscriptions SET next_billing_date = $1 WHERE id = $2', [
          periodEnd,
          sub.id,
        ]);
        continue;
      }

      // Fetch subscription lines (Price grandfathered snapshot)
      const linesRes = await client.query(
        `
        SELECT sl.*, 
               pr.name as product_name, 
               pv.attribute_value,
               t.rate_percentage as tax_rate
        FROM subscription_lines sl
        JOIN products pr ON sl.product_id = pr.id
        LEFT JOIN product_variants pv ON sl.variant_id = pv.id
        LEFT JOIN taxes t ON sl.tax_id = t.id
        WHERE sl.subscription_id = $1
      `,
        [sub.id],
      );

      if (linesRes.rows.length === 0) {
        skippedCount++;
        continue;
      }

      // Check discount eligibility
      let activeDiscount: any = null;
      const discountId = sub.discount_id;

      if (discountId) {
        // Edge Case 3: Discount Auto-Expiry and atomic current_uses increment
        const discountCheck = await client.query(
          `
          SELECT * FROM discounts 
          WHERE id = $1 
            AND $2 BETWEEN start_date AND COALESCE(end_date, '9999-12-31')
            AND (max_uses IS NULL OR current_uses < max_uses)
        `,
          [discountId, targetDate],
        );

        if (discountCheck.rows.length > 0) {
          // Atomically increment current_uses
          const incRes = await client.query(
            `UPDATE discounts 
             SET current_uses = current_uses + 1 
             WHERE id = $1 AND (max_uses IS NULL OR current_uses < max_uses)
             RETURNING *`,
            [discountId],
          );
          if (incRes.rows.length > 0) {
            activeDiscount = incRes.rows[0];
          }
        }
      }

      // Compute financial totals per Edge Case 4
      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;
      const invoiceLinesToInsert: any[] = [];

      // Calculate total subtotal first for discount threshold verification
      const grossSubtotal = linesRes.rows.reduce(
        (acc: number, l: any) => acc + Number(l.unit_price) * Number(l.quantity),
        0,
      );
      const totalQuantity = linesRes.rows.reduce(
        (acc: number, l: any) => acc + Number(l.quantity),
        0,
      );

      const discountApplies =
        activeDiscount &&
        grossSubtotal >= Number(activeDiscount.min_purchase_amount || 0) &&
        totalQuantity >= Number(activeDiscount.min_quantity || 1);

      for (const line of linesRes.rows) {
        const qty = Number(line.quantity);
        const unitPrice = Number(line.unit_price);
        const grossLine = qty * unitPrice;

        // Line discount calculation
        let lineDiscount = 0;
        if (discountApplies) {
          if (activeDiscount.applies_to === 'SUBSCRIPTION') {
            if (activeDiscount.discount_type === 'PERCENTAGE') {
              lineDiscount = (grossLine * Number(activeDiscount.discount_value)) / 100;
            } else {
              // Apportion fixed discount across lines proportionally
              lineDiscount = (grossLine / grossSubtotal) * Number(activeDiscount.discount_value);
            }
          } else if (activeDiscount.applies_to === 'SPECIFIC_PRODUCTS') {
            const dpRes = await client.query(
              'SELECT 1 FROM discount_products WHERE discount_id = $1 AND product_id = $2',
              [activeDiscount.id, line.product_id],
            );
            if (dpRes.rows.length > 0) {
              if (activeDiscount.discount_type === 'PERCENTAGE') {
                lineDiscount = (grossLine * Number(activeDiscount.discount_value)) / 100;
              } else {
                lineDiscount = Number(activeDiscount.discount_value);
              }
            }
          }
        }

        // Cap discount so line cannot be negative
        lineDiscount = Math.min(lineDiscount, grossLine);

        // Taxable Line Base = Gross Line - Line Discount
        const taxableBase = grossLine - lineDiscount;

        // Line Tax = Taxable Line Base * (rate_percentage / 100)
        const taxRate = Number(line.tax_rate || 0);
        const lineTax = (taxableBase * taxRate) / 100;

        // Line Total = Taxable Line Base + Line Tax
        const lineTotal = taxableBase + lineTax;

        subtotal += grossLine;
        discountTotal += lineDiscount;
        taxTotal += lineTax;

        const description = line.attribute_value
          ? `${line.product_name} - ${line.attribute_value}`
          : line.product_name;

        invoiceLinesToInsert.push({
          subscription_line_id: line.id,
          product_id: line.product_id,
          description,
          quantity: qty,
          unit_price: unitPrice.toFixed(2),
          discount_amount: lineDiscount.toFixed(2),
          tax_amount: lineTax.toFixed(2),
          line_total: lineTotal.toFixed(2),
        });
      }

      const totalAmount = subtotal - discountTotal + taxTotal;

      // Generate invoice number: INV-YYYY-XXXX
      const invCountRes = await client.query('SELECT COUNT(*) FROM invoices');
      const invSeq = Number(invCountRes.rows[0].count) + 1;
      const invNumber = `INV-${new Date().getFullYear()}-${String(invSeq).padStart(4, '0')}`;

      // Due date calculation (Issue date + payment_terms_days)
      const issueDate = new Date().toISOString().slice(0, 10);
      const dueDateObj = new Date(issueDate);
      dueDateObj.setDate(dueDateObj.getDate() + Number(sub.payment_terms_days || 0));
      const dueDate = dueDateObj.toISOString().slice(0, 10);

      try {
        const invInsertRes = await client.query(
          `INSERT INTO invoices (
            invoice_number, subscription_id, customer_id, status,
            billing_period_start, billing_period_end, issue_date, due_date,
            subtotal, discount_total, tax_total, total_amount, amount_paid
          ) VALUES ($1, $2, $3, 'CONFIRMED', $4, $5, $6, $7, $8, $9, $10, $11, 0.00)
          RETURNING *`,
          [
            invNumber,
            sub.id,
            sub.customer_id,
            periodStart,
            periodEnd,
            issueDate,
            dueDate,
            subtotal.toFixed(2),
            discountTotal.toFixed(2),
            taxTotal.toFixed(2),
            totalAmount.toFixed(2),
          ],
        );

        const newInvoice = invInsertRes.rows[0];

        // Insert invoice lines
        for (const il of invoiceLinesToInsert) {
          await client.query(
            `INSERT INTO invoice_lines (
              invoice_id, subscription_line_id, product_id,
              description, quantity, unit_price, discount_amount,
              tax_amount, line_total
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              newInvoice.id,
              il.subscription_line_id,
              il.product_id,
              il.description,
              il.quantity,
              il.unit_price,
              il.discount_amount,
              il.tax_amount,
              il.line_total,
            ],
          );
        }

        // Advance subscription next_billing_date
        await client.query('UPDATE subscriptions SET next_billing_date = $1 WHERE id = $2', [
          periodEnd,
          sub.id,
        ]);

        generatedCount++;
        createdInvoices.push(newInvoice);
      } catch (insertErr: any) {
        // Unique billing cycle violation or error -> skip gracefully
        if (insertErr.code === '23505') {
          skippedCount++;
        } else {
          throw insertErr;
        }
      }
    }

    await client.query('COMMIT');

    return res.json({
      message: 'Batch billing run completed',
      generatedCount,
      skippedCount,
      autoClosedCount,
      invoices: createdInvoices,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Batch billing error:', err);
    return res.status(500).json({ error: 'Batch billing run failed: ' + err.message });
  } finally {
    client.release();
  }
});
