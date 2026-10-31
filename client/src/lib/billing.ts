import { useSyncExternalStore } from 'react';
import { apiFetch } from './api';

// Admin data, loaded from the API by `loadBilling()`. Every collection is a small store: read with
// `use()`, change with `upsert`/`remove`, which update the screen at once and save to the server.
// If the server rejects a change, the store goes back to what it was and `onSaveError` is told why.

let saveErrorHandler: (message: string) => void = (message) => alert(message);

/** Where failed saves are reported. Defaults to a browser alert. */
export function onSaveError(handler: (message: string) => void) {
  saveErrorHandler = handler;
}

function createStore<T extends { id: string }>(
  resource: string | null,
  toBody: (item: T) => object = (item) => item,
) {
  let items: T[] = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const replace = (item: T) => {
    items = items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item];
  };
  const save = async (before: T[], request: () => Promise<T | void>) => {
    try {
      const saved = await request();
      if (saved) {
        replace(saved);
        emit();
      }
    } catch (error) {
      items = before;
      emit();
      saveErrorHandler(error instanceof Error ? error.message : 'Could not save. Try again.');
      throw error;
    }
  };
  return {
    use: () => useSyncExternalStore(subscribe, () => items),
    get: () => items,
    find: (id: string) => items.find((item) => item.id === id),
    /** Replaces everything without saving (used when loading from the API). */
    set(next: T[]) {
      items = next;
      emit();
    },
    upsert(item: T) {
      const before = items;
      replace(item);
      emit();
      if (!resource) return Promise.resolve();
      return save(before, () =>
        apiFetch<T>(`/api/${resource}/${item.id}`, { method: 'PUT', body: JSON.stringify(toBody(item)) }),
      ).catch(() => {});
    },
    remove(id: string) {
      const before = items;
      items = items.filter((i) => i.id !== id);
      emit();
      if (!resource) return Promise.resolve();
      return save(before, () => apiFetch<void>(`/api/${resource}/${id}`, { method: 'DELETE' })).catch(() => {});
    },
  };
}

export const today = () => new Date().toISOString().slice(0, 10);

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A new row id. The database uses UUIDs, so the client can pick one before saving. */
export const newId = () => crypto.randomUUID();

const round2 = (n: number) => Math.round(n * 100) / 100;

// --- Customers ---

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  gstin: string;
  createdAt: string;
};

export const customers = createStore<Customer>('customers');

// --- Taxes ---

export type Tax = { id: string; name: string; rate: number; active: boolean };

export const taxes = createStore<Tax>('taxes');

/** Combined rate of the active taxes on a product. */
export const taxRateFor = (taxIds: string[]) =>
  taxIds.reduce((sum, id) => {
    const tax = taxes.find(id);
    return tax?.active ? sum + tax.rate : sum;
  }, 0);

// --- Products, attributes, variants ---

export type AttributeValue = { id: string; value: string; extraPrice: number };
export type Attribute = { id: string; name: string; values: AttributeValue[] };

// The database stores one attribute name/value per product variant, so attributes are read from the
// products and only reach the server through the variants that use them.
export const attributes = createStore<Attribute>(null);

export type Variant = { id: string; name: string; valueIds: string[] };

export type Product = {
  id: string;
  name: string;
  type: 'Software' | 'Add-on' | 'Service';
  salesPrice: number;
  costPrice: number;
  notes: string;
  taxIds: string[];
  variants: Variant[];
  active: boolean;
};

export const products = createStore<Product>('products', (product) => ({
  ...product,
  variantDetails: product.variants.flatMap((variant) => {
    const attribute = attributes.get().find((a) => a.values.some((v) => variant.valueIds.includes(v.id)));
    const values = attribute?.values.filter((v) => variant.valueIds.includes(v.id)) ?? [];
    if (!attribute || !values.length) return [];
    return [
      {
        id: variant.id,
        attributeName: attribute.name,
        value: values.map((v) => v.value).join(' / '),
        extraPrice: values.reduce((sum, v) => sum + v.extraPrice, 0),
      },
    ];
  }),
}));

/** Variant price = product sales price + extras of its attribute values (PRD 4.2). */
export function variantPrice(product: Product, variant?: Variant) {
  if (!variant) return product.salesPrice;
  const extras = attributes
    .get()
    .flatMap((a) => a.values)
    .filter((v) => variant.valueIds.includes(v.id))
    .reduce((sum, v) => sum + v.extraPrice, 0);
  return product.salesPrice + extras;
}

// --- Plans ---

export type BillingPeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export type Plan = {
  id: string;
  name: string;
  price: number;
  period: BillingPeriod;
  minQuantity: number;
  availableFrom: string;
  availableUntil: string | null;
  autoClose: boolean;
  closable: boolean;
  pausable: boolean;
  renewable: boolean;
};

export const plans = createStore<Plan>('plans');

/** Monthly equivalent used for MRR (PRD 4.9). */
export const toMonthly = (amount: number, period: BillingPeriod) =>
  period === 'Yearly' ? amount / 12 : period === 'Weekly' ? (amount * 52) / 12 : period === 'Daily' ? (amount * 365) / 12 : amount;

export const isPlanSellable = (plan: Plan, on = today()) =>
  plan.availableFrom <= on && (!plan.availableUntil || plan.availableUntil >= on);

// --- Lines (shared by templates, subscriptions, invoices) ---

export type Line = {
  productId: string;
  variantId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number; // amount off this line, already applied before tax
};

export function lineAmounts(line: Line) {
  const base = round2(line.quantity * line.unitPrice);
  const discounted = Math.max(0, base - line.discount);
  const tax = round2((discounted * line.taxRate) / 100);
  return { base, discounted, tax, total: round2(discounted + tax) };
}

export function linesTotals(lines: Line[]) {
  return lines.reduce(
    (t, line) => {
      const a = lineAmounts(line);
      return {
        subtotal: round2(t.subtotal + a.base),
        discount: round2(t.discount + (a.base - a.discounted)),
        tax: round2(t.tax + a.tax),
        total: round2(t.total + a.total),
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 },
  );
}

/** A fresh line for a product/variant at today's price and tax. */
export function makeLine(productId: string, variantId: string | null = null, quantity = 1): Line {
  const product = products.find(productId)!;
  const variant = product.variants.find((v) => v.id === variantId);
  return {
    productId,
    variantId,
    description: variant ? `${product.name} (${variant.name})` : product.name,
    quantity,
    unitPrice: variantPrice(product, variant),
    taxRate: taxRateFor(product.taxIds),
    discount: 0,
  };
}

// --- Quotation templates ---

export type QuotationTemplate = {
  id: string;
  name: string;
  planId: string;
  validityDays: number;
  lines: Line[];
};

export const templates = createStore<QuotationTemplate>('templates');

// --- Subscriptions ---

export type SubscriptionStatus = 'Draft' | 'Quotation' | 'Confirmed' | 'Active' | 'Paused' | 'Closed';

export type Subscription = {
  id: string;
  number: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string | null;
  nextBilling: string | null;
  paymentTerms: number;
  quotationExpiresAt: string | null;
  lines: Line[];
  createdAt: string;
};

export const subscriptions = createStore<Subscription>('subscriptions');

/** Allowed next statuses (PRD 4.5). Pause/close also depend on plan flags. */
export function nextStatuses(s: Subscription): SubscriptionStatus[] {
  const plan = plans.find(s.planId);
  switch (s.status) {
    case 'Draft':
      return ['Quotation'];
    case 'Quotation':
      return ['Confirmed'];
    case 'Confirmed':
      return ['Active'];
    case 'Active':
      return [...(plan?.pausable ? (['Paused'] as const) : []), ...(plan?.closable ? (['Closed'] as const) : [])];
    case 'Paused':
      return ['Active', ...(plan?.closable ? (['Closed'] as const) : [])];
    default:
      return [];
  }
}

const periodDays: Record<BillingPeriod, number> = { Daily: 1, Weekly: 7, Monthly: 30, Yearly: 365 };

/** Renew = extend expiry by one plan period on the same subscription (PRD 4.5). */
export function renewSubscription(s: Subscription) {
  const plan = plans.find(s.planId)!;
  const from = s.expiryDate ?? today();
  subscriptions.upsert({ ...s, expiryDate: addDays(from, periodDays[plan.period]) });
}

// --- Discounts ---

export type Discount = {
  id: string;
  name: string;
  type: 'Fixed' | 'Percentage';
  value: number;
  minPurchase: number;
  minQuantity: number;
  startDate: string;
  endDate: string | null;
  usageLimit: number | null;
  timesUsed: number;
  scope: 'Products' | 'Subscription';
  productIds: string[];
};

export const discounts = createStore<Discount>('discounts');

export type DiscountState = 'Active' | 'Scheduled' | 'Expired' | 'Used up';

export function discountState(d: Discount, on = today()): DiscountState {
  if (d.usageLimit !== null && d.timesUsed >= d.usageLimit) return 'Used up';
  if (d.startDate > on) return 'Scheduled';
  if (d.endDate && d.endDate < on) return 'Expired';
  return 'Active';
}

// --- Invoices and payments ---

export type InvoiceStatus = 'Draft' | 'Confirmed' | 'Paid' | 'Cancelled';

export type Invoice = {
  id: string;
  number: string;
  subscriptionId: string;
  customerId: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  lines: Line[];
};

export type PaymentMethod = 'Cash' | 'Bank transfer' | 'Card' | 'UPI' | 'Other';

export type Payment = {
  id: string;
  invoiceId: string;
  method: PaymentMethod;
  amount: number;
  date: string;
  note: string;
};

export const invoices = createStore<Invoice>('invoices');

export const invoiceTotal = (invoice: Invoice) => linesTotals(invoice.lines).total;

export const payments = createStore<Payment>('payments');

export const amountPaid = (invoiceId: string, list = payments.get()) =>
  round2(list.filter((p) => p.invoiceId === invoiceId).reduce((sum, p) => sum + p.amount, 0));

/** Display status: Confirmed invoices show as Outstanding or Overdue (PRD 4.8). */
export function invoiceDisplayStatus(
  invoice: Invoice,
  on = today(),
): Exclude<InvoiceStatus, 'Confirmed'> | 'Outstanding' | 'Overdue' {
  if (invoice.status !== 'Confirmed') return invoice.status;
  return invoice.dueDate < on ? 'Overdue' : 'Outstanding';
}

/** Records a payment through the API, which rejects overpayment and marks the invoice Paid when settled. */
export async function recordPayment(payment: Omit<Payment, 'id'>) {
  const { payment: saved, invoiceStatus } = await apiFetch<{ payment: Payment; invoiceStatus: InvoiceStatus }>(
    '/api/payments',
    { method: 'POST', body: JSON.stringify(payment) },
  );
  payments.upsert(saved);
  const invoice = invoices.find(payment.invoiceId);
  if (invoice) invoices.upsert({ ...invoice, status: invoiceStatus });
}

/** Deleting a payment recalculates the invoice status (PRD 4.8). */
export async function deletePayment(id: string) {
  const payment = payments.find(id);
  if (!payment) return;
  const { invoiceStatus } = await apiFetch<{ invoiceStatus: InvoiceStatus }>(`/api/payments/${id}`, { method: 'DELETE' });
  payments.remove(id);
  const invoice = invoices.find(payment.invoiceId);
  if (invoice) invoices.upsert({ ...invoice, status: invoiceStatus });
}

/** Fills every store from the database. */
export async function loadBilling() {
  const [c, t, p, pl, tp, s, d, i, pay] = await Promise.all([
    apiFetch<Customer[]>('/api/customers'),
    apiFetch<Tax[]>('/api/taxes'),
    apiFetch<{ attributes: Attribute[]; products: Product[] }>('/api/products'),
    apiFetch<Plan[]>('/api/plans'),
    apiFetch<QuotationTemplate[]>('/api/templates'),
    apiFetch<Subscription[]>('/api/subscriptions'),
    apiFetch<Discount[]>('/api/discounts'),
    apiFetch<Invoice[]>('/api/invoices'),
    apiFetch<Payment[]>('/api/payments'),
  ]);
  customers.set(c);
  taxes.set(t);
  attributes.set(p.attributes);
  products.set(p.products);
  plans.set(pl);
  templates.set(tp);
  subscriptions.set(s);
  discounts.set(d);
  invoices.set(i);
  payments.set(pay);
}
