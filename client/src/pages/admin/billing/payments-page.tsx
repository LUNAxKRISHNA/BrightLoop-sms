import { Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  ConfirmDialog,
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
import {
  customers,
  deletePayment,
  invoices,
  payments,
  type Payment,
  type PaymentMethod,
} from '../../../lib/billing';
import { formatDate, formatMoney } from '../../../lib/portal';
import { paymentMethods, RecordPaymentDialog } from './record-payment-dialog';

export function PaymentsPage() {
  const list = payments.use();
  const allInvoices = invoices.use();
  const allCustomers = customers.use();
  const canEdit = useCanEdit('payments');
  const [method, setMethod] = useState<'all' | PaymentMethod>('all');
  const [query, setQuery] = useState('');
  const [recording, setRecording] = useState(false);
  const [deleting, setDeleting] = useState<Payment | null>(null);

  const invoiceOf = (p: Payment) => allInvoices.find((i) => i.id === p.invoiceId);
  const customerOf = (p: Payment) => allCustomers.find((c) => c.id === invoiceOf(p)?.customerId);
  const q = query.trim().toLowerCase();
  const rows = [...list]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((p) => method === 'all' || p.method === method)
    .filter(
      (p) =>
        !q ||
        invoiceOf(p)?.number.toLowerCase().includes(q) ||
        customerOf(p)?.name.toLowerCase().includes(q) ||
        p.note.toLowerCase().includes(q),
    );
  const collected = list.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <PageHeader
        title="Payments"
        description={
          <>
            Total collected{' '}
            <span className="font-mono font-medium text-foreground">{formatMoney(collected)}</span>
          </>
        }
        actions={
          canEdit && (
            <Button onClick={() => setRecording(true)}>
              <Plus size={14} /> Record payment
            </Button>
          )
        }
      />
      {!canEdit && <ReadOnlyNote />}

      <Toolbar aside={<SearchInput value={query} onChange={setQuery} placeholder="Search invoice or customer" />}>
        <FilterPills
          options={[
            { value: 'all' as const, label: 'All', count: list.length },
            ...paymentMethods.map((m) => ({
              value: m,
              label: m,
              count: list.filter((p) => p.method === m).length,
            })),
          ]}
          value={method}
          onChange={setMethod}
        />
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Invoice</th>
                <th className={th}>Customer</th>
                <th className={th}>Method</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={th}>Note</th>
                {canEdit && <th className={th} />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={canEdit ? 7 : 6}>No payments found.</EmptyRow>}
              {rows.map((p) => (
                <tr key={p.id} className={rowClass}>
                  <td className={`${td} text-muted-foreground`}>{formatDate(p.date)}</td>
                  <td className={td}>
                    <Link to={`/admin/invoices/${p.invoiceId}`} className="font-medium hover:underline">
                      {invoiceOf(p)?.number ?? p.invoiceId}
                    </Link>
                  </td>
                  <td className={td}>{customerOf(p)?.name ?? '—'}</td>
                  <td className={td}>{p.method}</td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(p.amount)}</td>
                  <td className={`${td} text-muted-foreground`}>{p.note || '—'}</td>
                  {canEdit && (
                    <td className={td}>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(p)}>
                          <Trash size={14} /> Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {recording && <RecordPaymentDialog onClose={() => setRecording(false)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete payment?"
          body={`${formatMoney(deleting.amount)} on ${invoiceOf(deleting)?.number ?? deleting.invoiceId} will be removed and the invoice balance recalculated.`}
          confirmLabel="Delete payment"
          destructive
          onConfirm={() => deletePayment(deleting.id).catch((error: Error) => alert(error.message))}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
