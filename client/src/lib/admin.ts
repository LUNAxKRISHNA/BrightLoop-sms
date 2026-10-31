import { useSyncExternalStore } from 'react';
import { apiFetch } from './api';
import { signOut } from './auth';

// Admin/staff area: sections, the team, the signed-in member and dashboard figures (PRD 4.1, 4.9).

/** Sections of the admin area. Staff only see the ones an admin grants them. */
export const sections = [
  { key: 'dashboard', label: 'Dashboard', to: '/admin' },
  { key: 'customers', label: 'Customers', to: '/admin/customers' },
  { key: 'subscriptions', label: 'Subscriptions', to: '/admin/subscriptions' },
  { key: 'templates', label: 'Quotation templates', to: '/admin/templates' },
  { key: 'invoices', label: 'Invoices', to: '/admin/invoices' },
  { key: 'payments', label: 'Payments', to: '/admin/payments' },
  { key: 'products', label: 'Products', to: '/admin/products' },
  { key: 'plans', label: 'Plans', to: '/admin/plans' },
  { key: 'taxes', label: 'Taxes', to: '/admin/taxes' },
  { key: 'discounts', label: 'Discounts', to: '/admin/discounts' },
  { key: 'staff', label: 'Team', to: '/admin/staff' },
] as const;

export type SectionKey = (typeof sections)[number]['key'];

/** Never grantable to staff. */
export const adminOnlySections: SectionKey[] = ['staff'];

export const grantableSections = sections.filter((s) => !adminOnlySections.includes(s.key));

export type Role = 'admin' | 'staff';

/** Anyone who can sign in to the admin area. Admins ignore `sections`: they get everything. */
export type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: Role;
  sections: SectionKey[];
  active: boolean;
  createdAt: string;
};

export type SessionUser = {
  name: string;
  email: string;
  role: Role;
  sections: SectionKey[];
};

const allSections = sections.map((s) => s.key);

// --- Team store (loaded from /api/staff) ---

let staff: StaffMember[] = [];
let me: StaffMember | null = null;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useStaff() {
  return useSyncExternalStore(subscribe, () => staff);
}

export async function loadStaff() {
  staff = await apiFetch<StaffMember[]>('/api/staff');
  emit();
}

/** Saves a team member. The server enforces unique emails and keeps at least one admin (PRD 4.1). */
export async function saveStaff(member: Omit<StaffMember, 'id' | 'createdAt'> & { id?: string }) {
  const id = member.id ?? crypto.randomUUID();
  const saved = await apiFetch<StaffMember>(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...member, email: member.email.toLowerCase() }),
  });
  staff = staff.some((s) => s.id === id) ? staff.map((s) => (s.id === id ? saved : s)) : [...staff, saved];
  emit();
}

export const activeAdminCount = () => staff.filter((s) => s.role === 'admin' && s.active).length;

const toSessionUser = (member: StaffMember): SessionUser => ({
  name: member.name,
  email: member.email,
  role: member.role,
  sections: member.role === 'admin' ? allSections : member.sections,
});

// --- Session (the token is kept by api.ts; this is who it belongs to) ---

/** Loads the signed-in admin/staff member. Throws if the token is missing or not staff. */
export async function loadSessionUser() {
  me = await apiFetch<StaffMember>('/api/me');
  emit();
  return toSessionUser(me);
}

export function signOutStaffArea() {
  me = null;
  staff = [];
  signOut();
  emit();
}

export function useSessionUser(): SessionUser | null {
  const current = useSyncExternalStore(subscribe, () => me);
  return current ? toSessionUser(current) : null;
}

export function canAccess(user: SessionUser, key: SectionKey) {
  if (user.role === 'admin') return true;
  return !adminOnlySections.includes(key) && user.sections.includes(key);
}

// --- Dashboard figures (PRD 4.9) ---

export type Dashboard = {
  summary: {
    activeSubscriptions: number;
    activeSubscriptionsChange: number;
    mrr: number;
    mrrChange: number;
    revenueInvoiced: number;
    revenueCollected: number;
    outstanding: number;
    overdueCount: number;
    overdueAmount: number;
  };
  revenueSeries: { date: Date; invoiced: number; collected: number }[];
  paidVsOutstanding: { month: string; paid: number; outstanding: number }[];
  subscriptionsByPlan: { label: string; value: number }[];
  overdueInvoices: { number: string; customer: string; due: string; amount: number }[];
  recentPayments: { date: string; customer: string; method: string; amount: number }[];
};

export async function fetchDashboard(): Promise<Dashboard> {
  const data = await apiFetch<Omit<Dashboard, 'revenueSeries'> & { revenueSeries: { date: string; invoiced: number; collected: number }[] }>(
    '/api/dashboard',
  );
  return { ...data, revenueSeries: data.revenueSeries.map((r) => ({ ...r, date: new Date(r.date) })) };
}
