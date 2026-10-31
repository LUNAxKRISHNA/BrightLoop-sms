import { Router, type Response } from 'express';
import { Prisma, type payment_method } from '@prisma/client';
import { randomPasswordHash } from './auth.js';
import { prisma } from './db.js';

// Admin data routes. Rows are returned (and accepted) in the shapes of the client types in
// client/src/lib/billing.ts, so the pages work on plain objects.

export const api = Router();

export const num = (d: Prisma.Decimal | null | undefined) => (d == null ? 0 : Number(d));
export const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
export const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
export const round2 = (n: number) => Math.round(n * 100) / 100;
const date = (s: string) => new Date(`${s}T00:00:00Z`);
const optDate = (s: string | null | undefined) => (s ? date(s) : null);
const upper = <T extends string>(s: string) => s.replace(/ /g, '_').toUpperCase() as T;

export const methodToClient: Record<payment_method, string> = {
  BANK_TRANSFER: 'Bank transfer',
  CREDIT_CARD: 'Card',
  UPI: 'UPI',
  CASH: 'Cash',
  OTHER: 'Other',
};
export const methodToDb = Object.fromEntries(
  Object.entries(methodToClient).map(([db, client]) => [client, db]),
) as Record<string, payment_method>;

type LineIn = {
  productId: string;
  variantId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
};

/** Same maths as `lineAmounts` on the client. */
export function lineAmounts(line: { quantity: number; unitPrice: number; taxRate: number; discount: number }) {
  const base = round2(line.quantity * line.unitPrice);
  const discounted = Math.max(0, base - line.discount);
  const tax = round2((discounted * line.taxRate) / 100);
  return { base, discounted, tax, total: round2(discounted + tax) };
}

/** Turns a failed write into a readable message; FK violations mean the row is still in use. */
function writeError(res: Response, error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2003') return res.status(409).json({ error: "This is still used elsewhere, so it can't be removed." });
    if (error.code === 'P2002') return res.status(409).json({ error: 'That value is already taken.' });
  }
  throw error;
}

// --- Customers ---

const customerInclude = { users: true } satisfies Prisma.customer_accountsInclude;
const customerToClient = (c: Prisma.customer_accountsGetPayload<{ include: typeof customerInclude }>) => ({
  id: c.id,
  name: c.users.full_name ?? c.company_name,
  email: c.users.email,
  phone: c.phone ?? '',
  company: c.company_name,
  city: c.city ?? '',
  gstin: c.gstin ?? '',
  createdAt: day(c.created_at),
});

api.get('/customers', async (_req, res) => {
  const rows = await prisma.customer_accounts.findMany({ include: customerInclude, orderBy: { created_at: 'asc' } });
  res.json(rows.map(customerToClient));
});

/** A customer is a CUSTOMER user plus its account; new ones set their password via "forgot password". */
api.put('/customers/:id', async (req, res) => {
  const { company, name, email, phone, city, gstin } = req.body ?? {};
  const data = { company_name: String(company || name), phone: phone || null, city: city || null, gstin: gstin || null };
  const user = { email: String(email).toLowerCase(), full_name: name || null };
  try {
    const existing = await prisma.customer_accounts.findUnique({ where: { id: req.params.id } });
    const row = existing
      ? await prisma.customer_accounts.update({
          where: { id: existing.id },
          data: { ...data, users: { update: user } },
          include: customerInclude,
        })
      : await prisma.customer_accounts.create({
          data: {
            ...data,
            id: req.params.id,
            users: {
              create: { ...user, role: 'CUSTOMER', password_hash: await randomPasswordHash() },
            },
          },
          include: customerInclude,
        });
    res.json(customerToClient(row));
  } catch (error) {
    writeError(res, error);
  }
});

// --- Taxes ---

const taxToClient = (t: Prisma.taxesGetPayload<object>) => ({
  id: t.id,
  name: t.name,
  rate: num(t.rate_percentage),
  active: t.is_active,
});

api.get('/taxes', async (_req, res) => {
  const rows = await prisma.taxes.findMany({ orderBy: { name: 'asc' } });
  res.json(rows.map(taxToClient));
});

api.put('/taxes/:id', async (req, res) => {
  const { name, rate, active } = req.body ?? {};
  const data = { name, rate_percentage: rate, is_active: active };
  const row = await prisma.taxes.upsert({
    where: { id: req.params.id },
    update: data,
    create: { ...data, id: req.params.id, created_by: req.user!.id },
  });
  res.json(taxToClient(row));
});

api.delete('/taxes/:id', async (req, res) => {
  try {
    await prisma.taxes.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    writeError(res, error);
  }
});

// --- Products and their variants ---
// The DB keeps one attribute name/value per variant, so attributes are derived from variants.

const productInclude = { product_variants: true } satisfies Prisma.productsInclude;
type ProductRow = Prisma.productsGetPayload<{ include: typeof productInclude }>;

const productToClient = (p: ProductRow) => ({
  id: p.id,
  name: p.name,
  type: p.product_type === 'SERVICE' ? 'Service' : 'Goods',
  salesPrice: num(p.sales_price),
  costPrice: num(p.cost_price),
  notes: p.notes ?? '',
  taxIds: p.default_tax_id ? [p.default_tax_id] : [],
  variants: p.product_variants.map((v) => ({ id: v.id, name: v.attribute_value, valueIds: [v.id] })),
  active: p.is_active,
});

function attributesOf(rows: ProductRow[]) {
  const attributes = new Map<string, { id: string; name: string; values: object[] }>();
  for (const v of rows.flatMap((p) => p.product_variants)) {
    const attr = attributes.get(v.attribute_name) ?? { id: v.attribute_name, name: v.attribute_name, values: [] };
    attr.values.push({ id: v.id, value: v.attribute_value, extraPrice: num(v.price_surcharge) });
    attributes.set(v.attribute_name, attr);
  }
  return [...attributes.values()];
}

api.get('/products', async (_req, res) => {
  const rows = await prisma.products.findMany({ include: productInclude, orderBy: { name: 'asc' } });
  res.json({ attributes: attributesOf(rows), products: rows.map(productToClient) });
});

type VariantIn = { id: string; attributeName: string; value: string; extraPrice: number };

api.put('/products/:id', async (req, res) => {
  const { name, type, salesPrice, costPrice, notes, taxIds, active } = req.body ?? {};
  const variants: VariantIn[] = req.body?.variantDetails ?? [];
  const data = {
    name,
    product_type: type === 'Service' ? ('SERVICE' as const) : ('ADD_ON' as const),
    sales_price: salesPrice,
    cost_price: costPrice,
    notes: notes || null,
    default_tax_id: taxIds?.[0] ?? null,
    is_active: active,
  };
  try {
    const row = await prisma.$transaction(async (tx) => {
      await tx.products.upsert({ where: { id: req.params.id }, update: data, create: { ...data, id: req.params.id } });
      await tx.product_variants.deleteMany({
        where: { product_id: req.params.id, id: { notIn: variants.map((v) => v.id) } },
      });
      for (const v of variants) {
        const fields = { attribute_name: v.attributeName, attribute_value: v.value, price_surcharge: v.extraPrice };
        await tx.product_variants.upsert({
          where: { id: v.id },
          update: fields,
          create: { ...fields, id: v.id, product_id: req.params.id },
        });
      }
      return tx.products.findUniqueOrThrow({ where: { id: req.params.id }, include: productInclude });
    });
    res.json(productToClient(row));
  } catch (error) {
    writeError(res, error);
  }
});

api.delete('/products/:id', async (req, res) => {
  try {
    await prisma.products.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    writeError(res, error);
  }
});

// --- Plans ---

const planToClient = (p: Prisma.plansGetPayload<object>) => ({
  id: p.id,
  name: p.name,
  price: num(p.base_price),
  period: title(p.billing_interval),
  minQuantity: p.min_quantity,
  availableFrom: day(p.available_from),
  availableUntil: day(p.available_to),
  autoClose: p.auto_close_at_end,
  closable: p.can_close_early,
  pausable: p.can_pause,
  renewable: p.can_renew,
});

api.get('/plans', async (_req, res) => {
  const rows = await prisma.plans.findMany({ orderBy: { name: 'asc' } });
  res.json(rows.map(planToClient));
});

api.put('/plans/:id', async (req, res) => {
  const b = req.body ?? {};
  const data = {
    name: b.name,
    base_price: b.price,
    billing_interval: upper<'MONTHLY'>(b.period),
    min_quantity: b.minQuantity,
    available_from: date(b.availableFrom),
    available_to: optDate(b.availableUntil),
    auto_close_at_end: b.autoClose,
    can_close_early: b.closable,
    can_pause: b.pausable,
    can_renew: b.renewable,
  };
  const row = await prisma.plans.upsert({ where: { id: req.params.id }, update: data, create: { ...data, id: req.params.id } });
  res.json(planToClient(row));
});

api.delete('/plans/:id', async (req, res) => {
  try {
    await prisma.plans.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    writeError(res, error);
  }
});

// --- Quotation templates ---

const templateInclude = {
  quotation_template_lines: { include: { products: { include: { taxes: true } }, product_variants: true } },
} satisfies Prisma.quotation_templatesInclude;

const templateToClient = (t: Prisma.quotation_templatesGetPayload<{ include: typeof templateInclude }>) => ({
  id: t.id,
  name: t.name,
  planId: t.plan_id,
  validityDays: t.validity_days,
  lines: t.quotation_template_lines.map((l) => ({
    productId: l.product_id,
    variantId: l.variant_id,
    description: l.product_variants ? `${l.products.name} (${l.product_variants.attribute_value})` : l.products.name,
    quantity: l.default_quantity,
    unitPrice: num(l.products.sales_price) + num(l.product_variants?.price_surcharge),
    taxRate: l.products.taxes?.is_active ? num(l.products.taxes.rate_percentage) : 0,
    discount: 0,
  })),
});

api.get('/templates', async (_req, res) => {
  const rows = await prisma.quotation_templates.findMany({ include: templateInclude, orderBy: { name: 'asc' } });
  res.json(rows.map(templateToClient));
});

api.put('/templates/:id', async (req, res) => {
  const { name, planId, validityDays } = req.body ?? {};
  const lines: LineIn[] = req.body?.lines ?? [];
  const data = { name, plan_id: planId, validity_days: validityDays };
  const row = await prisma.$transaction(async (tx) => {
    await tx.quotation_templates.upsert({ where: { id: req.params.id }, update: data, create: { ...data, id: req.params.id } });
    await tx.quotation_template_lines.deleteMany({ where: { template_id: req.params.id } });
    await tx.quotation_template_lines.createMany({
      data: lines.map((l) => ({
        template_id: req.params.id,
        product_id: l.productId,
        variant_id: l.variantId,
        default_quantity: l.quantity,
      })),
    });
    return tx.quotation_templates.findUniqueOrThrow({ where: { id: req.params.id }, include: templateInclude });
  });
  res.json(templateToClient(row));
});

api.delete('/templates/:id', async (req, res) => {
  try {
    await prisma.quotation_templates.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    writeError(res, error);
  }
});

// --- Subscriptions ---

export const subscriptionInclude = {
  subscription_lines: { include: { products: true, product_variants: true, taxes: true } },
  quotation_templates: true,
  plans: true,
} satisfies Prisma.subscriptionsInclude;
export type SubscriptionRow = Prisma.subscriptionsGetPayload<{ include: typeof subscriptionInclude }>;

export const subscriptionLines = (s: SubscriptionRow) =>
  s.subscription_lines.map((l) => {
    const base = l.quantity * num(l.unit_price);
    return {
      productId: l.product_id,
      variantId: l.variant_id,
      description: l.product_variants ? `${l.products.name} (${l.product_variants.attribute_value})` : l.products.name,
      quantity: l.quantity,
      unitPrice: num(l.unit_price),
      taxRate: num(l.taxes?.rate_percentage),
      discount: round2(Math.max(0, base - num(l.line_amount))),
    };
  });

const subscriptionToClient = (s: SubscriptionRow) => ({
  id: s.id,
  number: s.subscription_number,
  customerId: s.customer_id,
  planId: s.plan_id,
  status: title(s.status),
  startDate: day(s.start_date),
  expiryDate: day(s.expiry_date),
  // The DB requires a date; drafts and quotations have not started billing yet.
  nextBilling: s.status === 'DRAFT' || s.status === 'QUOTATION' ? null : day(s.next_billing_date),
  paymentTerms: s.payment_terms_days,
  quotationExpiresAt:
    s.status === 'QUOTATION' && s.quotation_templates
      ? day(new Date(s.created_at.getTime() + s.quotation_templates.validity_days * 86_400_000))
      : null,
  lines: subscriptionLines(s),
  createdAt: day(s.created_at),
});

api.get('/subscriptions', async (_req, res) => {
  const rows = await prisma.subscriptions.findMany({ include: subscriptionInclude, orderBy: { created_at: 'asc' } });
  res.json(rows.map(subscriptionToClient));
});

/** Tax for a line: the product's default tax, matched by rate when the line carries one. */
async function lineTaxIds(tx: Prisma.TransactionClient, lines: LineIn[]) {
  const products = await tx.products.findMany({ where: { id: { in: lines.map((l) => l.productId) } } });
  const taxes = await tx.taxes.findMany();
  return lines.map((l) => {
    const own = products.find((p) => p.id === l.productId)?.default_tax_id ?? null;
    if (own && taxes.find((t) => t.id === own && num(t.rate_percentage) === l.taxRate)) return own;
    return taxes.find((t) => num(t.rate_percentage) === l.taxRate)?.id ?? (l.taxRate ? own : null);
  });
}

api.put('/subscriptions/:id', async (req, res) => {
  const b = req.body ?? {};
  const lines: LineIn[] = b.lines ?? [];
  const data = {
    subscription_number: b.number,
    customer_id: b.customerId,
    plan_id: b.planId,
    status: upper<'DRAFT'>(b.status),
    start_date: date(b.startDate),
    expiry_date: optDate(b.expiryDate),
    next_billing_date: date(b.nextBilling ?? b.startDate),
    payment_terms_days: b.paymentTerms,
  };
  try {
    const row = await prisma.$transaction(async (tx) => {
      await tx.subscriptions.upsert({ where: { id: req.params.id }, update: data, create: { ...data, id: req.params.id } });
      // Lines are replaced wholesale; invoices keep their own copies, so unlink them first.
      const old = await tx.subscription_lines.findMany({ where: { subscription_id: req.params.id }, select: { id: true } });
      await tx.invoice_lines.updateMany({
        where: { subscription_line_id: { in: old.map((l) => l.id) } },
        data: { subscription_line_id: null },
      });
      await tx.subscription_lines.deleteMany({ where: { subscription_id: req.params.id } });
      const taxIds = await lineTaxIds(tx, lines);
      await tx.subscription_lines.createMany({
        data: lines.map((l, i) => {
          const a = lineAmounts(l);
          return {
            subscription_id: req.params.id,
            product_id: l.productId,
            variant_id: l.variantId,
            quantity: l.quantity,
            unit_price: l.unitPrice,
            tax_id: taxIds[i],
            tax_amount: a.tax,
            line_amount: a.discounted,
          };
        }),
      });
      return tx.subscriptions.findUniqueOrThrow({ where: { id: req.params.id }, include: subscriptionInclude });
    });
    res.json(subscriptionToClient(row));
  } catch (error) {
    writeError(res, error);
  }
});

// --- Discounts ---

const discountInclude = { discount_products: true } satisfies Prisma.discountsInclude;
const discountToClient = (d: Prisma.discountsGetPayload<{ include: typeof discountInclude }>) => ({
  id: d.id,
  name: d.name,
  type: title(d.discount_type),
  value: num(d.discount_value),
  minPurchase: num(d.min_purchase_amount),
  minQuantity: d.min_quantity,
  startDate: day(d.start_date),
  endDate: day(d.end_date),
  usageLimit: d.max_uses,
  timesUsed: d.current_uses,
  scope: d.applies_to === 'SPECIFIC_PRODUCTS' ? 'Products' : 'Subscription',
  productIds: d.discount_products.map((p) => p.product_id),
});

api.get('/discounts', async (_req, res) => {
  const rows = await prisma.discounts.findMany({ include: discountInclude, orderBy: { start_date: 'asc' } });
  res.json(rows.map(discountToClient));
});

api.put('/discounts/:id', async (req, res) => {
  const b = req.body ?? {};
  const data = {
    name: b.name,
    discount_type: upper<'FIXED'>(b.type),
    discount_value: b.value,
    applies_to: b.scope === 'Products' ? ('SPECIFIC_PRODUCTS' as const) : ('SUBSCRIPTION' as const),
    min_purchase_amount: b.minPurchase,
    min_quantity: Math.max(1, b.minQuantity ?? 1),
    start_date: date(b.startDate),
    end_date: optDate(b.endDate),
    max_uses: b.usageLimit ?? null,
  };
  const productIds: string[] = b.scope === 'Products' ? (b.productIds ?? []) : [];
  const row = await prisma.$transaction(async (tx) => {
    await tx.discounts.upsert({
      where: { id: req.params.id },
      update: data,
      create: { ...data, id: req.params.id, created_by: req.user!.id },
    });
    await tx.discount_products.deleteMany({ where: { discount_id: req.params.id } });
    await tx.discount_products.createMany({
      data: productIds.map((product_id) => ({ discount_id: req.params.id, product_id })),
    });
    return tx.discounts.findUniqueOrThrow({ where: { id: req.params.id }, include: discountInclude });
  });
  res.json(discountToClient(row));
});

api.delete('/discounts/:id', async (req, res) => {
  try {
    await prisma.discounts.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (error) {
    writeError(res, error);
  }
});

// --- Invoices and payments ---

const invoiceInclude = { invoice_lines: true } satisfies Prisma.invoicesInclude;
type InvoiceRow = Prisma.invoicesGetPayload<{ include: typeof invoiceInclude }>;

export const invoiceLines = (i: InvoiceRow) =>
  i.invoice_lines.map((l) => {
    const taxable = l.quantity * num(l.unit_price) - num(l.discount_amount);
    return {
      productId: l.product_id,
      variantId: null,
      description: l.description,
      quantity: l.quantity,
      unitPrice: num(l.unit_price),
      taxRate: taxable > 0 ? round2((num(l.tax_amount) / taxable) * 100) : 0,
      discount: num(l.discount_amount),
    };
  });

const invoiceToClient = (i: InvoiceRow) => ({
  id: i.id,
  number: i.invoice_number,
  subscriptionId: i.subscription_id,
  customerId: i.customer_id,
  status: title(i.status),
  invoiceDate: day(i.issue_date),
  dueDate: day(i.due_date),
  periodStart: day(i.billing_period_start),
  periodEnd: day(i.billing_period_end),
  lines: invoiceLines(i),
});

api.get('/invoices', async (_req, res) => {
  const rows = await prisma.invoices.findMany({ include: invoiceInclude, orderBy: { issue_date: 'asc' } });
  res.json(rows.map(invoiceToClient));
});

/** Creates an invoice with its lines, or changes an existing one's status (lines are fixed once issued). */
api.put('/invoices/:id', async (req, res) => {
  const b = req.body ?? {};
  const status = upper<'DRAFT'>(b.status);
  const existing = await prisma.invoices.findUnique({ where: { id: req.params.id } });
  if (existing) {
    const row = await prisma.invoices.update({ where: { id: existing.id }, data: { status }, include: invoiceInclude });
    return res.json(invoiceToClient(row));
  }
  const lines: LineIn[] = b.lines ?? [];
  const amounts = lines.map(lineAmounts);
  const sum = (pick: (a: ReturnType<typeof lineAmounts>) => number) => round2(amounts.reduce((s, a) => s + pick(a), 0));
  const row = await prisma.invoices.create({
    data: {
      id: req.params.id,
      invoice_number: b.number,
      subscription_id: b.subscriptionId,
      customer_id: b.customerId,
      status,
      issue_date: date(b.invoiceDate),
      due_date: date(b.dueDate),
      billing_period_start: date(b.periodStart),
      billing_period_end: date(b.periodEnd),
      subtotal: sum((a) => a.base),
      discount_total: sum((a) => a.base - a.discounted),
      tax_total: sum((a) => a.tax),
      total_amount: sum((a) => a.total),
      invoice_lines: {
        create: lines.map((l, i) => ({
          product_id: l.productId,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unitPrice,
          discount_amount: l.discount,
          tax_amount: amounts[i].tax,
          line_total: amounts[i].total,
        })),
      },
    },
    include: invoiceInclude,
  });
  res.json(invoiceToClient(row));
});

const paymentToClient = (p: Prisma.paymentsGetPayload<object>) => ({
  id: p.id,
  invoiceId: p.invoice_id,
  method: methodToClient[p.payment_method],
  amount: num(p.amount),
  date: day(p.payment_date),
  note: p.notes ?? '',
});

api.get('/payments', async (_req, res) => {
  const rows = await prisma.payments.findMany({ orderBy: { payment_date: 'asc' } });
  res.json(rows.map(paymentToClient));
});

/** Records a payment, rejecting overpayment, and marks the invoice Paid when settled. */
export async function recordPayment(input: {
  invoiceId: string;
  method: payment_method;
  amount: number;
  date: Date;
  note: string | null;
  recordedBy: string;
}) {
  const invoice = await prisma.invoices.findUnique({ where: { id: input.invoiceId } });
  if (!invoice || invoice.status !== 'CONFIRMED') throw new Error('Only confirmed invoices accept payments.');
  const outstanding = round2(num(invoice.total_amount) - num(invoice.amount_paid));
  if (!(input.amount > 0)) throw new Error('Enter an amount above zero.');
  if (input.amount > outstanding) throw new Error(`Amount is more than the outstanding ${outstanding.toFixed(2)}.`);

  const paid = round2(num(invoice.amount_paid) + input.amount);
  const [payment, updated] = await prisma.$transaction([
    prisma.payments.create({
      data: {
        invoice_id: invoice.id,
        payment_method: input.method,
        amount: input.amount,
        payment_date: input.date,
        notes: input.note,
        recorded_by: input.recordedBy,
      },
    }),
    prisma.invoices.update({
      where: { id: invoice.id },
      data: { amount_paid: paid, status: paid >= num(invoice.total_amount) ? 'PAID' : 'CONFIRMED' },
    }),
  ]);
  return { payment: paymentToClient(payment), invoiceStatus: title(updated.status) };
}

api.post('/payments', async (req, res) => {
  const { invoiceId, method, amount, date: on, note } = req.body ?? {};
  if (!methodToDb[method]) return res.status(400).json({ error: 'Unknown payment method.' });
  try {
    const result = await recordPayment({
      invoiceId: String(invoiceId),
      method: methodToDb[method],
      amount: Number(amount),
      date: date(on),
      note: note || null,
      recordedBy: req.user!.id,
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Could not record the payment.' });
  }
});

/** Deleting a payment recalculates the invoice balance and status. */
api.delete('/payments/:id', async (req, res) => {
  const payment = await prisma.payments.findUnique({ where: { id: req.params.id }, include: { invoices: true } });
  if (!payment) return res.status(404).json({ error: 'Payment not found.' });
  const invoice = payment.invoices;
  const paid = round2(Math.max(0, num(invoice.amount_paid) - num(payment.amount)));
  const [, updated] = await prisma.$transaction([
    prisma.payments.delete({ where: { id: payment.id } }),
    prisma.invoices.update({
      where: { id: invoice.id },
      data: {
        amount_paid: paid,
        status: invoice.status === 'PAID' && paid < num(invoice.total_amount) ? 'CONFIRMED' : invoice.status,
      },
    }),
  ]);
  res.json({ invoiceStatus: title(updated.status) });
});
