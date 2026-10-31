import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, requireRole('ADMIN', 'STAFF'));

// GET /api/dashboard/finance
// Runs the 4 canonical SQL queries from Section 5 of DB.md
dashboardRouter.get('/finance', async (req, res) => {
  const { start_date, end_date } = req.query;

  // Default date range for period revenue: from beginning of current year to today
  const defaultStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const defaultEnd = new Date().toISOString().slice(0, 10);

  const start = (start_date as string) || defaultStart;
  const end = (end_date as string) || defaultEnd;

  const startTime = Date.now();

  try {
    // 1. Active Subscriptions Count (hits idx_sub_status_billing)
    const activeSubsPromise = pool.query(
      "SELECT COUNT(*)::int as active_subscriptions FROM subscriptions WHERE status = 'ACTIVE';",
    );

    // 2. Revenue Collected (Period) (hits idx_payments_date)
    const revenuePromise = pool.query(
      'SELECT COALESCE(SUM(amount), 0.00)::numeric(12,2) as revenue_collected FROM payments WHERE payment_date BETWEEN $1 AND $2;',
      [start, end],
    );

    // 3. Total Outstanding (Owed) (hits idx_inv_overdue / idx_inv_customer)
    const outstandingPromise = pool.query(
      "SELECT COALESCE(SUM(total_amount - amount_paid), 0.00)::numeric(12,2) as total_outstanding FROM invoices WHERE status = 'CONFIRMED';",
    );

    // 4. Overdue Invoices List (hits idx_inv_overdue partial index)
    const overdueInvoicesPromise = pool.query(
      `
      SELECT i.id, i.invoice_number, i.subscription_id, i.customer_id,
             i.status, i.billing_period_start, i.billing_period_end,
             i.issue_date, i.due_date, i.total_amount, i.amount_paid,
             (i.total_amount - i.amount_paid)::numeric(12,2) as balance_due,
             ca.company_name,
             s.subscription_number
      FROM invoices i
      JOIN customer_accounts ca ON i.customer_id = ca.id
      JOIN subscriptions s ON i.subscription_id = s.id
      WHERE i.status = 'CONFIRMED' AND i.due_date < CURRENT_DATE
      ORDER BY i.due_date ASC;
    `,
    );

    const [activeSubsRes, revenueRes, outstandingRes, overdueRes] = await Promise.all([
      activeSubsPromise,
      revenuePromise,
      outstandingPromise,
      overdueInvoicesPromise,
    ]);

    const executionTimeMs = Date.now() - startTime;

    return res.json({
      period: {
        start_date: start,
        end_date: end,
      },
      metrics: {
        active_subscriptions: activeSubsRes.rows[0].active_subscriptions,
        revenue_collected: Number(revenueRes.rows[0].revenue_collected).toFixed(2),
        total_outstanding: Number(outstandingRes.rows[0].total_outstanding).toFixed(2),
        overdue_invoices_count: overdueRes.rows.length,
      },
      overdue_invoices: overdueRes.rows,
      execution_time_ms: executionTimeMs,
    });
  } catch (err: any) {
    console.error('Finance dashboard query error:', err);
    return res.status(500).json({ error: 'Failed to compute finance dashboard metrics' });
  }
});
