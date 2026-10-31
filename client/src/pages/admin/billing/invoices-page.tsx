import { Lightning } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  ReadOnlyNote,
  rowClass,
  SearchInput,
  td,
  th,
  theadClass,
  Toolbar,
  useCanEdit,
} from '../../../components/admin/admin-ui';
import { Card, EmptyRow, FilterPills, PageHeader } from '../../../components/portal/portal-ui';
import { Button } from '../../../components/ui/button';
import { StatusBadge, type Status } from '../../../components/ui/status-badge';
import {
  addDays,
  amountPaid,
  customers,
  invoiceDisplayStatus,
  invoices,
  invoiceTotal,
  payments,
  plans,
  subscriptions,
  newId,
  today,
  type BillingPeriod,
} from '../../../lib/billing';
import { formatDate, formatMoney } from '../../../lib/portal';

type Filter = 'all' | 'Draft' | 'Outstanding' | 'Overdue' | 'Paid' | 'Cancelled';

const periodDays: Record<BillingPeriod, number> = { Daily: 1, Weekly: 7, Monthly: 30, Yearly: 365 };

/** Draft invoices for every Active subscription that is due (PRD 4.8). Returns how many were created. */
function generateDueInvoices() {
  const on = today();
  let created = 0;
  for (const s of subscriptions.get()) {
    if (s.status !== 'Active' || !s.nextBilling || s.nextBilling > on) continue;
    const plan = plans.find(s.planId);
    const days = plan ? periodDays[plan.period] : 30;
    const periodStart = s.nextBilling;
    const nextBilling = addDays(periodStart, days);
    const exists = invoices.get().some((i) => i.subscriptionId === s.id && i.periodStart === periodStart);
    if (!exists) {
      // Number from the highest existing invoice number.
      const n = invoices.get().reduce((max, i) => Math.max(max, Number(i.number.split('-').pop()) || 0), 0) + 1;
      invoices.upsert({
        id: newId(),
        number: `INV-${on.slice(0, 4)}-${String(n).padStart(4, '0')}`,
        subscriptionId: s.id,
        customerId: s.customerId,
        status: 'Draft',
        invoiceDate: on,
        dueDate: addDays(on, s.paymentTerms),
        periodStart,
        periodEnd: addDays(nextBilling, -1),
        lines: s.lines.map((line) => ({ ...line })),
      });
      created++;
    }
    subscriptions.upsert({ ...s, nextBilling });
  }
  return created;
}

export function InvoicesPage() {
  const list = invoices.use();
  const allPayments = payments.use();
  const allCustomers = customers.use();
  const allSubscriptions = subscriptions.use();
  const canEdit = useCanEdit('invoices');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const rows = list
    .map((invoice) => {
      const total = invoiceTotal(invoice);
      const paid = amountPaid(invoice.id, allPayments);
      return {
        invoice,
        total,
        paid,
        balance: invoice.status === 'Cancelled' ? 0 : Math.round((total - paid) * 100) / 100,
        status: invoiceDisplayStatus(invoice),
        customer: allCustomers.find((c) => c.id === invoice.customerId),
        subscription: allSubscriptions.find((s) => s.id === invoice.subscriptionId),
      };
    })
    .sort((a, b) => b.invoice.invoiceDate.localeCompare(a.invoice.invoiceDate));

  const count = (status: Status) => rows.filter((r) => r.status === status).length;
  const sum = (status: Status) =>
    rows.filter((r) => r.status === status).reduce((total, r) => total + r.balance, 0);
  const outstandingTotal = sum('Outstanding') + sum('Overdue');

  const q = query.trim().toLowerCase();
  const visible = rows
    .filter((r) => filter === 'all' || r.status === filter)
    .filter(
      (r) => !q || r.invoice.number.toLowerCase().includes(q) || r.customer?.name.toLowerCase().includes(q),
    );

  const onGenerate = () => {
    const created = generateDueInvoices();
    setNotice(
      created === 0
        ? 'No subscriptions are due for billing.'
        : `Created ${created} draft invoice${created === 1 ? '' : 's'}.`,
    );
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Generated from active subscriptions each billing period."
        actions={
          canEdit && (
            <Button onClick={onGenerate}>
              <Lightning size={14} /> Generate due invoices
            </Button>
          )
        }
      />
      {!canEdit && <ReadOnlyNote />}
      {notice && (
        <p
          role="status"
          className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
        >
          {notice}
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="mt-1 font-mono text-xl font-semibold">{formatMoney(outstandingTotal)}</p>
          <p className="text-xs text-muted-foreground">
            {count('Outstanding') + count('Overdue')} unpaid invoices
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="mt-1 font-mono text-xl font-semibold text-status-red-fg">{formatMoney(sum('Overdue'))}</p>
          <p className="text-xs text-muted-foreground">{count('Overdue')} past due date</p>
        </Card>
      </div>

      <Toolbar aside={<SearchInput value={query} onChange={setQuery} placeholder="Search number or customer" />}>
        <FilterPills
          options={[
            { value: 'all', label: 'All', count: rows.length },
            { value: 'Draft', label: 'Draft', count: count('Draft') },
            { value: 'Outstanding', label: 'Outstanding', count: count('Outstanding') },
            { value: 'Overdue', label: 'Overdue', count: count('Overdue') },
            { value: 'Paid', label: 'Paid', count: count('Paid') },
            { value: 'Cancelled', label: 'Cancelled', count: count('Cancelled') },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Number</th>
                <th className={th}>Customer</th>
                <th className={th}>Subscription</th>
                <th className={th}>Invoice date</th>
                <th className={th}>Due date</th>
                <th className={`${th} text-right`}>Total</th>
                <th className={`${th} text-right`}>Paid</th>
                <th className={`${th} text-right`}>Balance</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && <EmptyRow colSpan={9}>No invoices found.</EmptyRow>}
              {visible.map((r) => (
                <tr key={r.invoice.id} className={rowClass}>
                  <td className={td}>
                    <Link to={`/admin/invoices/${r.invoice.id}`} className="font-medium hover:underline">
                      {r.invoice.number}
                    </Link>
                  </td>
                  <td className={td}>{r.customer?.name ?? '—'}</td>
                  <td className={td}>
                    <Link
                      to={`/admin/subscriptions/${r.invoice.subscriptionId}`}
                      className="text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {r.subscription?.number ?? r.invoice.subscriptionId}
                    </Link>
                  </td>
                  <td className={`${td} text-muted-foreground`}>{formatDate(r.invoice.invoiceDate)}</td>
                  <td className={`${td} text-muted-foreground`}>{formatDate(r.invoice.dueDate)}</td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(r.total)}</td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(r.paid)}</td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(r.balance)}</td>
                  <td className={td}>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
