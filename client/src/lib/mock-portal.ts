import { useSyncExternalStore } from 'react';
import type { Status } from '../components/ui/status-badge';

// Mock data for the customer portal until the /portal API exists (PRD 4.10).

export type BillingPeriod = 'Monthly' | 'Yearly' | 'Weekly';

export type Line = {
  product: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

export type PortalSubscription = {
  id: string;
  number: string;
  plan: string;
  status: Status;
  period: BillingPeriod;
  startDate: string;
  expiryDate: string | null;
  nextBilling: string | null;
  paymentTerms: number;
  lines: Line[];
};

export type Payment = { date: string; amount: number; method: string };

export type PortalInvoice = {
  id: string;
  number: string;
  subscriptionId: string;
  issued: string;
  due: string;
  status: Status;
  lines: Line[];
  payments: Payment[];
};

export const customer = {
  id: 'CUS-0031',
  name: 'Asha Patel',
  email: 'asha@example.com',
  phone: '+91 98765 43210',
  company: 'Patel Design Studio',
  since: '2025-08-12',
  billing: {
    address: '14, 2nd Floor, Lake View Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560034',
    gstin: '',
  },
};

const proLines: Line[] = [
  { product: 'Pro seat', quantity: 3, unitPrice: 599, taxRate: 18 },
  { product: 'Extra storage (100 GB)', quantity: 1, unitPrice: 199, taxRate: 18 },
  { product: 'Priority support', quantity: 1, unitPrice: 299, taxRate: 18 },
];
const backupLines: Line[] = [
  { product: 'Cloud Backup (1 TB)', quantity: 1, unitPrice: 9999, taxRate: 18 },
];
const analyticsLines: Line[] = [
  { product: 'Analytics Add-on', quantity: 1, unitPrice: 699, taxRate: 18 },
];
const starterLines: Line[] = [
  { product: 'Starter seat', quantity: 1, unitPrice: 849, taxRate: 18 },
];

export const subscriptions: PortalSubscription[] = [
  {
    id: 's1',
    number: 'SUB-0012',
    plan: 'Pro Workspace',
    status: 'Active',
    period: 'Monthly',
    startDate: '2026-05-12',
    expiryDate: null,
    nextBilling: '2026-11-12',
    paymentTerms: 14,
    lines: proLines,
  },
  {
    id: 's2',
    number: 'SUB-0019',
    plan: 'Cloud Backup',
    status: 'Active',
    period: 'Yearly',
    startDate: '2026-02-03',
    expiryDate: '2028-02-03',
    nextBilling: '2027-02-03',
    paymentTerms: 14,
    lines: backupLines,
  },
  {
    id: 's3',
    number: 'SUB-0024',
    plan: 'Analytics Add-on',
    status: 'Confirmed',
    period: 'Monthly',
    startDate: '2026-10-20',
    expiryDate: null,
    nextBilling: '2026-11-20',
    paymentTerms: 14,
    lines: analyticsLines,
  },
  {
    id: 's4',
    number: 'SUB-0007',
    plan: 'Starter',
    status: 'Closed',
    period: 'Monthly',
    startDate: '2025-08-12',
    expiryDate: '2026-05-12',
    nextBilling: null,
    paymentTerms: 14,
    lines: starterLines,
  },
];

const invoice = (
  id: string,
  number: string,
  subscriptionId: string,
  issued: string,
  due: string,
  status: Status,
  lines: Line[],
  paidOn?: string,
  method = 'UPI',
): PortalInvoice => ({
  id,
  number,
  subscriptionId,
  issued,
  due,
  status,
  lines,
  payments: paidOn ? [{ date: paidOn, amount: totals(lines).total, method }] : [],
});

// `let` so mockPayInvoice can swap in a new array; ES module bindings stay live.
export let invoices: PortalInvoice[] = [
  invoice('i1', 'INV-0152', 's3', '2026-10-20', '2026-11-03', 'Outstanding', analyticsLines),
  invoice('i2', 'INV-0141', 's1', '2026-10-12', '2026-10-26', 'Overdue', proLines),
  invoice('i3', 'INV-0128', 's1', '2026-09-12', '2026-09-26', 'Paid', proLines, '2026-09-20'),
  invoice('i4', 'INV-0097', 's1', '2026-08-12', '2026-08-26', 'Paid', proLines, '2026-08-18'),
  invoice(
    'i5',
    'INV-0084',
    's1',
    '2026-07-12',
    '2026-07-26',
    'Paid',
    proLines,
    '2026-07-15',
    'Card',
  ),
  invoice(
    'i6',
    'INV-0071',
    's1',
    '2026-06-12',
    '2026-06-26',
    'Paid',
    proLines,
    '2026-06-24',
    'Card',
  ),
  invoice(
    'i7',
    'INV-0058',
    's1',
    '2026-05-12',
    '2026-05-26',
    'Paid',
    proLines,
    '2026-05-13',
    'Card',
  ),
  invoice('i8', 'INV-0052', 's4', '2026-04-12', '2026-04-26', 'Paid', starterLines, '2026-04-20'),
  invoice(
    'i9',
    'INV-0031',
    's2',
    '2026-02-03',
    '2026-02-17',
    'Paid',
    backupLines,
    '2026-02-10',
    'Bank transfer',
  ),
];

export function totals(lines: Line[]) {
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const tax = lines.reduce((sum, l) => sum + (l.quantity * l.unitPrice * l.taxRate) / 100, 0);
  return { subtotal, tax, total: subtotal + tax };
}

export const invoiceTotal = (inv: PortalInvoice) => totals(inv.lines).total;
export const amountPaid = (inv: PortalInvoice) => inv.payments.reduce((s, p) => s + p.amount, 0);
export const subscriptionTotal = (sub: PortalSubscription) => totals(sub.lines).total;

export const findSubscription = (id: string) => subscriptions.find((s) => s.id === id);
export const findInvoice = (id: string) => invoices.find((i) => i.id === id);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isUnpaid = (inv: PortalInvoice) =>
  inv.status === 'Outstanding' || inv.status === 'Overdue';

// Tiny store so pages re-render after a mock payment.
let version = 0;
const listeners = new Set<() => void>();

export function useInvoices() {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
  );
  return invoices;
}

export type PaymentMethod = 'UPI' | 'Card' | 'Net banking';

/** Mock payment: settles the full balance. Real gateway is out of scope (PRD). */
export async function mockPayInvoice(id: string, method: PaymentMethod) {
  await delay(1200);
  const today = new Date().toISOString().slice(0, 10);
  invoices = invoices.map((inv) =>
    inv.id === id
      ? {
          ...inv,
          status: 'Paid',
          payments: [
            ...inv.payments,
            { date: today, amount: invoiceTotal(inv) - amountPaid(inv), method },
          ],
        }
      : inv,
  );
  version += 1;
  listeners.forEach((listener) => listener());
}

/** Mock save; password `wrong` fails the current-password check. */
export async function mockSaveProfile(values: object) {
  await delay(800);
  if ('currentPassword' in values && values.currentPassword === 'wrong')
    throw new Error('Current password is incorrect.');
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export const formatMoney = (amount: number) => currency.format(amount);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
