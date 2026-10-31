import { Router } from 'express';
import type { billing_interval } from '@prisma/client';
import { randomPasswordHash, requireAuth } from './auth.js';
import { prisma } from './db.js';
import {
  day,
  invoiceLines,
  methodToClient,
  num,
  recordPayment,
  round2,
  subscriptionInclude,
  subscriptionLines,
  title,
} from './routes.js';

const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d: Date) => d.toISOString().slice(0, 7);
const toMonthly = (amount: number, interval: billing_interval) =>
  interval === 'YEARLY' ? amount / 12 : interval === 'WEEKLY' ? (amount * 52) / 12 : interval === 'DAILY' ? (amount * 365) / 12 : amount;
const pctChange = (now: number, before: number) => (before ? round2(((now - before) / before) * 100) : 0);

// --- Dashboard (PRD 4.9) ---

export const dashboard = Router();

dashboard.get('/', async (_req, res) => {
  const [subs, invoices, payments] = await Promise.all([
    prisma.subscriptions.findMany({ include: subscriptionInclude }),
    prisma.invoices.findMany({ include: { customer_accounts: true } }),
    prisma.payments.findMany({ include: { invoices: { include: { customer_accounts: true } } }, orderBy: { payment_date: 'desc' } }),
  ]);
  const on = today();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);

  const active = subs.filter((s) => s.status === 'ACTIVE');
  const activeMonthAgo = active.filter((s) => s.start_date <= monthAgo);
  const mrrOf = (list: typeof subs) =>
    round2(
      list.reduce(
        (sum, s) => sum + toMonthly(s.subscription_lines.reduce((t, l) => t + num(l.line_amount), 0), s.plans.billing_interval),
        0,
      ),
    );

  const billed = invoices.filter((i) => i.status === 'CONFIRMED' || i.status === 'PAID');
  const open = invoices.filter((i) => i.status === 'CONFIRMED');
  const balance = (i: (typeof invoices)[number]) => round2(num(i.total_amount) - num(i.amount_paid));
  const overdue = open.filter((i) => (day(i.due_date) ?? '') < on);

  // Last 12 months, oldest first.
  const months = Array.from({ length: 12 }, (_, k) => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - (11 - k));
    return d;
  });
  const revenueSeries = months.map((m) => ({
    date: m.toISOString(),
    invoiced: round2(billed.filter((i) => monthKey(i.issue_date) === monthKey(m)).reduce((s, i) => s + num(i.total_amount), 0)),
    collected: round2(payments.filter((p) => monthKey(p.payment_date) === monthKey(m)).reduce((s, p) => s + num(p.amount), 0)),
  }));
  const paidVsOutstanding = months.slice(-6).map((m) => {
    const inMonth = billed.filter((i) => monthKey(i.issue_date) === monthKey(m));
    const paid = round2(inMonth.reduce((s, i) => s + num(i.amount_paid), 0));
    const total = round2(inMonth.reduce((s, i) => s + num(i.total_amount), 0));
    return { month: m.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' }), paid, outstanding: round2(total - paid) };
  });

  const byPlan = new Map<string, number>();
  for (const s of active) byPlan.set(s.plans.name, (byPlan.get(s.plans.name) ?? 0) + 1);

  res.json({
    summary: {
      activeSubscriptions: active.length,
      activeSubscriptionsChange: pctChange(active.length, activeMonthAgo.length),
      mrr: mrrOf(active),
      mrrChange: pctChange(mrrOf(active), mrrOf(activeMonthAgo)),
      // "This month" and "not yet due" figures, as labelled on the dashboard.
      revenueInvoiced: revenueSeries[11].invoiced,
      revenueCollected: revenueSeries[11].collected,
      outstanding: round2(open.filter((i) => !overdue.includes(i)).reduce((s, i) => s + balance(i), 0)),
      overdueCount: overdue.length,
      overdueAmount: round2(overdue.reduce((s, i) => s + balance(i), 0)),
    },
    revenueSeries,
    paidVsOutstanding,
    subscriptionsByPlan: [...byPlan].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    overdueInvoices: overdue
      .sort((a, b) => a.due_date.getTime() - b.due_date.getTime())
      .slice(0, 5)
      .map((i) => ({ number: i.invoice_number, customer: i.customer_accounts.company_name, due: day(i.due_date), amount: balance(i) })),
    recentPayments: payments.slice(0, 5).map((p) => ({
      date: day(p.payment_date),
      customer: p.invoices.customer_accounts.company_name,
      method: methodToClient[p.payment_method],
      amount: num(p.amount),
    })),
  });
});

// --- Team (PRD 4.1) ---

export const staff = Router();

const allSections = ['dashboard', 'customers', 'subscriptions', 'templates', 'invoices', 'payments', 'products', 'plans', 'taxes', 'discounts'];

type StaffRow = {
  id: string;
  email: string;
  role: string;
  created_at: Date;
  full_name: string | null;
  phone: string | null;
  job_title: string | null;
  sections: string[];
  is_active: boolean;
};

const staffToClient = (u: StaffRow) => ({
  id: u.id,
  name: u.full_name ?? u.email.split('@')[0],
  email: u.email,
  phone: u.phone ?? '',
  jobTitle: u.job_title ?? '',
  role: u.role === 'ADMIN' ? 'admin' : 'staff',
  sections: u.role === 'ADMIN' ? [...allSections, 'staff'] : u.sections.filter((s) => allSections.includes(s)),
  active: u.is_active,
  createdAt: day(u.created_at),
});

staff.get('/', async (_req, res) => {
  const rows = await prisma.users.findMany({ where: { role: { in: ['ADMIN', 'STAFF'] } }, orderBy: { created_at: 'asc' } });
  res.json(rows.map(staffToClient));
});

/** The signed-in admin/staff member. Open to staff too, unlike the rest of this router. */
export const me = Router();
me.get('/', async (req, res) => {
  const user = await prisma.users.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json(staffToClient(user));
});

staff.put('/:id', requireAuth('ADMIN'), async (req, res) => {
  const id = String(req.params.id);
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const role = req.body?.role === 'admin' ? ('ADMIN' as const) : ('STAFF' as const);
  const clash = await prisma.users.findUnique({ where: { email } });
  if (clash && clash.id !== id) return res.status(409).json({ error: 'A team member with this email already exists.' });

  const b = req.body ?? {};
  const active = b.active !== false;
  const current = await prisma.users.findUnique({ where: { id } });
  if (current?.role === 'ADMIN' && current.is_active && (role !== 'ADMIN' || !active)) {
    const admins = await prisma.users.count({ where: { role: 'ADMIN', is_active: true } });
    if (admins === 1) return res.status(400).json({ error: "You can't remove the last active admin. Make someone else an admin first." });
  }
  const data = {
    email,
    role,
    full_name: b.name || null,
    phone: b.phone || null,
    job_title: b.jobTitle || null,
    sections: Array.isArray(b.sections) ? b.sections.filter((s: string) => allSections.includes(s)) : [],
    is_active: active,
  };
  const row = current
    ? await prisma.users.update({ where: { id: current.id }, data })
    : await prisma.users.create({
        data: { ...data, id, created_by: req.user!.id, password_hash: await randomPasswordHash() },
      });
  res.json(staffToClient(row));
});

// --- Customer portal (PRD 4.10): only the signed-in customer's own data. ---

export const portal = Router();

const portalMethod = { UPI: 'UPI', Card: 'CREDIT_CARD', 'Net banking': 'BANK_TRANSFER' } as const;

async function accountOf(userId: string) {
  return prisma.customer_accounts.findUniqueOrThrow({ where: { user_id: userId }, include: { users: true } });
}

portal.get('/', async (req, res) => {
  const account = await accountOf(req.user!.id);
  const [subs, invoices] = await Promise.all([
    prisma.subscriptions.findMany({
      where: { customer_id: account.id, status: { notIn: ['DRAFT'] } },
      include: subscriptionInclude,
      orderBy: { start_date: 'desc' },
    }),
    prisma.invoices.findMany({
      where: { customer_id: account.id, status: { not: 'DRAFT' } },
      include: { invoice_lines: true, payments: { orderBy: { payment_date: 'asc' } } },
      orderBy: { issue_date: 'desc' },
    }),
  ]);
  const on = today();
  const portalLine = (l: { description: string; quantity: number; unitPrice: number; taxRate: number; discount: number }) => ({
    product: l.description,
    quantity: l.quantity,
    // Portal lines carry no separate discount, so fold it into the unit price.
    unitPrice: l.quantity ? round2(l.unitPrice - l.discount / l.quantity) : l.unitPrice,
    taxRate: l.taxRate,
  });

  res.json({
    customer: {
      id: account.id,
      name: account.users.full_name ?? account.company_name,
      email: account.users.email,
      phone: account.phone ?? '',
      company: account.company_name,
      since: day(account.created_at),
      billing: {
        address: account.billing_address ?? '',
        city: account.city ?? '',
        state: account.state ?? '',
        postalCode: account.postal_code ?? '',
        gstin: account.gstin ?? '',
      },
    },
    subscriptions: subs.map((s) => ({
      id: s.id,
      number: s.subscription_number,
      plan: s.plans.name,
      status: title(s.status),
      period: title(s.plans.billing_interval),
      startDate: day(s.start_date),
      expiryDate: day(s.expiry_date),
      nextBilling: s.status === 'ACTIVE' || s.status === 'CONFIRMED' ? day(s.next_billing_date) : null,
      paymentTerms: s.payment_terms_days,
      lines: subscriptionLines(s).map(portalLine),
    })),
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.invoice_number,
      subscriptionId: i.subscription_id,
      issued: day(i.issue_date),
      due: day(i.due_date),
      status: i.status === 'CONFIRMED' ? ((day(i.due_date) ?? '') < on ? 'Overdue' : 'Outstanding') : title(i.status),
      lines: invoiceLines(i).map(portalLine),
      payments: i.payments.map((p) => ({ date: day(p.payment_date), amount: num(p.amount), method: methodToClient[p.payment_method] })),
    })),
  });
});

/** Settles the full balance. A real gateway is out of scope (PRD), so this just records the payment. */
portal.post('/invoices/:id/pay', async (req, res) => {
  const account = await accountOf(req.user!.id);
  const invoice = await prisma.invoices.findFirst({ where: { id: req.params.id, customer_id: account.id } });
  const method = portalMethod[req.body?.method as keyof typeof portalMethod];
  if (!invoice || !method) return res.status(404).json({ error: 'Invoice not found.' });
  try {
    await recordPayment({
      invoiceId: invoice.id,
      method,
      amount: round2(num(invoice.total_amount) - num(invoice.amount_paid)),
      date: new Date(`${today()}T00:00:00Z`),
      note: 'Paid from the customer portal',
      recordedBy: req.user!.id,
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Payment failed.' });
  }
});

/** Saves whichever profile fields are sent: the details form or the billing form. */
portal.patch('/profile', async (req, res) => {
  const account = await accountOf(req.user!.id);
  const b = req.body ?? {};
  const email = b.email ? String(b.email).toLowerCase() : undefined;
  if (email && email !== account.users.email && (await prisma.users.findUnique({ where: { email } }))) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const text = (v: unknown) => (v === undefined ? undefined : String(v).trim() || null);
  await prisma.customer_accounts.update({
    where: { id: account.id },
    data: {
      ...(b.company ? { company_name: String(b.company) } : {}),
      phone: text(b.phone),
      billing_address: text(b.address),
      city: text(b.city),
      state: text(b.state),
      postal_code: text(b.postalCode),
      gstin: text(b.gstin)?.toUpperCase(),
      users: { update: { email, full_name: text(b.name) ?? undefined } },
    },
  });
  res.json({ ok: true });
});
