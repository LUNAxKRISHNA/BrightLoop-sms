import { CheckCircle, CreditCard, EnvelopeSimple, Printer, Trash, XCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ConfirmDialog,
  ReadOnlyNote,
  rowClass,
  td,
  th,
  theadClass,
  useCanEdit,
} from '../../../components/admin/admin-ui';
import { Card, EmptyRow, Facts, PageHeader } from '../../../components/portal/portal-ui';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from '../../../components/ui/status-badge';
import {
  amountPaid,
  customers,
  deletePayment,
  invoiceDisplayStatus,
  invoices,
  lineAmounts,
  linesTotals,
  payments,
  subscriptions,
  type Line,
  type Payment,
} from '../../../lib/billing';
import { formatDate, formatMoney } from '../../../lib/portal';
import { RecordPaymentDialog } from './record-payment-dialog';

// Hides the admin chrome (sidebar, top bar) when printing this page.
const printStyles = `@media print { aside, nav, header { display: none !important; } }`;

function BillingLinesTable({ lines }: { lines: Line[] }) {
  const totals = linesTotals(lines);
  const money = `${td} text-right font-mono`;
  const footRow = (label: string, value: number, strong?: boolean) => (
    <tr className={strong ? 'font-semibold' : 'text-muted-foreground'}>
      <td colSpan={5} className={`${td} text-right`}>
        {label}
      </td>
      <td className={money}>{formatMoney(value)}</td>
    </tr>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead className={theadClass}>
          <tr>
            <th className={th}>Description</th>
            <th className={`${th} text-right`}>Qty</th>
            <th className={`${th} text-right`}>Unit price</th>
            <th className={`${th} text-right`}>Discount</th>
            <th className={`${th} text-right`}>Tax %</th>
            <th className={`${th} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && <EmptyRow colSpan={6}>No lines.</EmptyRow>}
          {lines.map((line, index) => (
            <tr key={index} className="border-b border-border">
              <td className={td}>{line.description}</td>
              <td className={money}>{line.quantity}</td>
              <td className={money}>{formatMoney(line.unitPrice)}</td>
              <td className={money}>{line.discount ? formatMoney(line.discount) : '—'}</td>
              <td className={money}>{line.taxRate}%</td>
              <td className={money}>{formatMoney(lineAmounts(line).discounted)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="print:break-inside-avoid">
          {footRow('Subtotal', totals.subtotal)}
          {totals.discount > 0 && footRow('Discount', -totals.discount)}
          {footRow('Tax', totals.tax)}
          {footRow('Total', totals.total, true)}
        </tfoot>
      </table>
    </div>
  );
}

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const all = invoices.use();
  const allPayments = payments.use();
  const allCustomers = customers.use();
  const allSubscriptions = subscriptions.use();
  const canEdit = useCanEdit('invoices');
  const canPay = useCanEdit('payments');
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [recording, setRecording] = useState(false);
  const [deleting, setDeleting] = useState<Payment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const invoice = all.find((i) => i.id === id);
  if (!invoice) {
    return (
      <>
        <PageHeader title="Invoice not found" back={{ to: '/admin/invoices', label: 'Invoices' }} />
        <p className="text-muted-foreground">There is no invoice with id {id}.</p>
      </>
    );
  }

  const customer = allCustomers.find((c) => c.id === invoice.customerId);
  const subscription = allSubscriptions.find((s) => s.id === invoice.subscriptionId);
  const status = invoiceDisplayStatus(invoice);
  const total = linesTotals(invoice.lines).total;
  const paid = amountPaid(invoice.id, allPayments);
  const balance = invoice.status === 'Cancelled' ? 0 : Math.round((total - paid) * 100) / 100;
  const invoicePayments = allPayments.filter((p) => p.invoiceId === invoice.id);

  return (
    <>
      <style>{printStyles}</style>
      <PageHeader
        back={{ to: '/admin/invoices', label: 'Invoices' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {invoice.number} <StatusBadge status={status} />
          </span>
        }
        description={customer?.company || customer?.name}
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit && invoice.status === 'Draft' && (
              <Button onClick={() => setConfirming(true)}>
                <CheckCircle size={14} /> Confirm
              </Button>
            )}
            {canPay && invoice.status === 'Confirmed' && (
              <Button onClick={() => setRecording(true)}>
                <CreditCard size={14} /> Record payment
              </Button>
            )}
            {canEdit && invoice.status !== 'Draft' && invoice.status !== 'Cancelled' && (
              <Button
                variant="secondary"
                onClick={() => setNotice(`Sent to ${customer?.email ?? 'the customer'}.`)}
              >
                <EnvelopeSimple size={14} /> Send by email
              </Button>
            )}
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={14} /> Print
            </Button>
            {canEdit && invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
              <Button variant="ghost" onClick={() => setCancelling(true)}>
                <XCircle size={14} /> Cancel invoice
              </Button>
            )}
          </div>
        }
      />
      <div className="print:hidden">
        {!canEdit && <ReadOnlyNote />}
        {notice && (
          <p
            role="status"
            className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
          >
            {notice}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setNotice(null)}
            >
              Dismiss
            </button>
          </p>
        )}
        {invoice.status !== 'Draft' && (
          <p className="mb-3 text-xs text-muted-foreground">
            {invoice.status} invoices can't be edited.
          </p>
        )}
      </div>

      <Card className="invoice-sheet mb-4 overflow-hidden print:border-0 print:shadow-none">
        <Facts
          items={[
            {
              label: 'Customer',
              value: (
                <>
                  {customer?.name ?? '—'}
                  {customer && <span className="block text-xs font-normal text-muted-foreground">{customer.email}</span>}
                </>
              ),
            },
            {
              label: 'Subscription',
              value: (
                <Link to={`/admin/subscriptions/${invoice.subscriptionId}`} className="hover:underline">
                  {subscription?.number ?? invoice.subscriptionId}
                </Link>
              ),
            },
            { label: 'Invoice date', value: formatDate(invoice.invoiceDate) },
            { label: 'Due date', value: formatDate(invoice.dueDate) },
            {
              label: 'Period',
              value: `${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`,
            },
            { label: 'Total', value: <span className="font-mono">{formatMoney(total)}</span> },
            { label: 'Paid', value: <span className="font-mono">{formatMoney(paid)}</span> },
            { label: 'Balance', value: <span className="font-mono">{formatMoney(balance)}</span> },
          ]}
        />
        <div className="border-t border-border">
          <BillingLinesTable lines={invoice.lines} />
        </div>
      </Card>

      <Card className="print:hidden">
        <h2 className="border-b border-border px-5 py-3 font-semibold">Payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Method</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={th}>Note</th>
                {canPay && <th className={th} />}
              </tr>
            </thead>
            <tbody>
              {invoicePayments.length === 0 && (
                <EmptyRow colSpan={canPay ? 5 : 4}>No payments yet.</EmptyRow>
              )}
              {invoicePayments.map((p) => (
                <tr key={p.id} className={rowClass}>
                  <td className={`${td} text-muted-foreground`}>{formatDate(p.date)}</td>
                  <td className={td}>{p.method}</td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(p.amount)}</td>
                  <td className={`${td} text-muted-foreground`}>{p.note || '—'}</td>
                  {canPay && (
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

      {confirming && (
        <ConfirmDialog
          title={`Confirm ${invoice.number}?`}
          body="Confirmed invoices can't be edited and start accepting payments."
          confirmLabel="Confirm invoice"
          onConfirm={() => invoices.upsert({ ...invoice, status: 'Confirmed' })}
          onClose={() => setConfirming(false)}
        />
      )}
      {cancelling && (
        <ConfirmDialog
          title={`Cancel ${invoice.number}?`}
          body="The invoice stays on record but no longer counts as owed. This can't be undone."
          confirmLabel="Cancel invoice"
          destructive
          onConfirm={() => invoices.upsert({ ...invoice, status: 'Cancelled' })}
          onClose={() => setCancelling(false)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete payment?"
          body={`${formatMoney(deleting.amount)} will be removed and the invoice balance recalculated.`}
          confirmLabel="Delete payment"
          destructive
          onConfirm={() => deletePayment(deleting.id).catch((error: Error) => alert(error.message))}
          onClose={() => setDeleting(null)}
        />
      )}
      {recording && <RecordPaymentDialog invoiceId={invoice.id} onClose={() => setRecording(false)} />}
    </>
  );
}
