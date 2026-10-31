import { useSyncExternalStore } from 'react';
import type { Status } from '../components/ui/status-badge';
import { apiFetch } from './api';

// Customer portal data for the signed-in customer, from /api/portal (PRD 4.10).

export type BillingPeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

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

export type PortalCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  since: string;
  billing: { address: string; city: string; state: string; postalCode: string; gstin: string };
};

// Live bindings: `loadPortal()` swaps these in for the signed-in customer.
export let customer: PortalCustomer = {
  id: '',
  name: '',
  email: '',
  phone: '',
  company: '',
  since: '',
  billing: { address: '', city: '', state: '', postalCode: '', gstin: '' },
};
export let subscriptions: PortalSubscription[] = [];
export let invoices: PortalInvoice[] = [];

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

export const isUnpaid = (inv: PortalInvoice) =>
  inv.status === 'Outstanding' || inv.status === 'Overdue';

// Tiny store so pages re-render after the data is (re)loaded.
let version = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function usePortalVersion() {
  return useSyncExternalStore(subscribe, () => version);
}

export function useInvoices() {
  usePortalVersion();
  return invoices;
}

/** Loads the signed-in customer's own account, subscriptions and invoices. */
export async function loadPortal() {
  const data = await apiFetch<{ customer: PortalCustomer; subscriptions: PortalSubscription[]; invoices: PortalInvoice[] }>(
    '/api/portal',
  );
  customer = data.customer;
  subscriptions = data.subscriptions;
  invoices = data.invoices;
  version += 1;
  listeners.forEach((listener) => listener());
}

export type PaymentMethod = 'UPI' | 'Card' | 'Net banking';

/** Settles the full balance. A real gateway is out of scope (PRD), so the server just records it. */
export async function payInvoice(id: string, method: PaymentMethod) {
  await apiFetch(`/api/portal/invoices/${id}/pay`, { method: 'POST', body: JSON.stringify({ method }) });
  await loadPortal();
}

/** Saves profile or billing details, then reloads so every page shows them. */
export async function saveProfile(values: object) {
  await apiFetch('/api/portal/profile', { method: 'PATCH', body: JSON.stringify(values) });
  await loadPortal();
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
