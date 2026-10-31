import { ArrowsClockwise, PencilSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ConfirmDialog,
  Dialog,
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
  addDays,
  customers as customerStore,
  invoiceDisplayStatus,
  invoices as invoiceStore,
  invoiceTotal,
  nextStatuses,
  plans as planStore,
  renewSubscription,
  subscriptions,
  today,
  type Line,
  type Subscription,
  type SubscriptionStatus,
} from '../../../lib/billing';
import { formatDate, formatMoney } from '../../../lib/portal';
import { LinesEditor, linesError, LinesView } from './lines-editor';

const QUOTATION_VALIDITY_DAYS = 15;

const actionLabel = (from: SubscriptionStatus, to: SubscriptionStatus) =>
  ({
    Quotation: 'Send quotation',
    Confirmed: 'Confirm',
    Active: from === 'Paused' ? 'Resume' : 'Activate',
    Paused: 'Pause',
    Closed: 'Close',
    Draft: 'Back to draft',
  })[to];

const actionBody: Partial<Record<SubscriptionStatus, string>> = {
  Quotation: `The customer gets the quotation. It stays valid for ${QUOTATION_VALIDITY_DAYS} days.`,
  Confirmed: 'The customer accepted the quotation. Lines can no longer be changed.',
  Active: 'Billing starts on the next billing date.',
  Paused: 'No invoices are created while paused. You can resume any time.',
  Closed: 'The subscription ends and stops billing. This cannot be undone.',
};

/** Applies a status change with the date side effects from PRD 4.5. */
function transition(s: Subscription, to: SubscriptionStatus): Subscription {
  switch (to) {
    case 'Quotation':
      return { ...s, status: to, quotationExpiresAt: addDays(today(), QUOTATION_VALIDITY_DAYS) };
    case 'Confirmed':
      return { ...s, status: to, nextBilling: s.startDate };
    case 'Active':
      return {
        ...s,
        status: to,
        nextBilling: s.status === 'Paused' ? today() : (s.nextBilling ?? s.startDate),
      };
    case 'Paused':
    case 'Closed':
      return { ...s, status: to, nextBilling: null };
    default:
      return { ...s, status: to };
  }
}

export function SubscriptionDetailPage() {
  const { id } = useParams();
  const list = subscriptions.use();
  const customers = customerStore.use();
  const plans = planStore.use();
  const invoices = invoiceStore.use();
  const canEdit = useCanEdit('subscriptions');
  const [pending, setPending] = useState<SubscriptionStatus | 'renew' | null>(null);
  const [editingLines, setEditingLines] = useState(false);

  const s = list.find((x) => x.id === id);
  if (!s) {
    return (
      <>
        <PageHeader title="Subscription not found" back={{ to: '/admin/subscriptions', label: 'Subscriptions' }} />
        <p className="text-muted-foreground">It may have been removed.</p>
      </>
    );
  }

  const customer = customers.find((c) => c.id === s.customerId);
  const plan = plans.find((p) => p.id === s.planId);
  const own = invoices.filter((i) => i.subscriptionId === s.id).sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  const linesEditable = canEdit && (s.status === 'Draft' || s.status === 'Quotation');
  const canRenew = canEdit && plan?.renewable && s.status === 'Active';
  const next = canEdit ? nextStatuses(s) : [];

  return (
    <>
      <PageHeader
        back={{ to: '/admin/subscriptions', label: 'Subscriptions' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{s.number}</span>
            <StatusBadge status={s.status} />
          </span>
        }
        description={customer ? `${customer.name}${customer.company ? ` · ${customer.company}` : ''}` : undefined}
        actions={
          (next.length > 0 || canRenew) && (
            <>
              {canRenew && (
                <Button variant="secondary" onClick={() => setPending('renew')}>
                  <ArrowsClockwise size={14} /> Renew
                </Button>
              )}
              {next.map((to, index) => (
                <Button
                  key={to}
                  variant={to === 'Closed' ? 'secondary' : index === 0 ? 'primary' : 'secondary'}
                  onClick={() => setPending(to)}
                >
                  {actionLabel(s.status, to)}
                </Button>
              ))}
            </>
          )
        }
      />
      {!canEdit && <ReadOnlyNote />}

      <Card className="mb-6">
        <Facts
          items={[
            { label: 'Customer', value: customer?.name ?? s.customerId },
            { label: 'Plan', value: plan?.name ?? s.planId },
            { label: 'Billing period', value: plan?.period ?? '—' },
            { label: 'Start', value: formatDate(s.startDate) },
            { label: 'Expiry', value: s.expiryDate ? formatDate(s.expiryDate) : 'No end date' },
            { label: 'Next billing', value: s.nextBilling ? formatDate(s.nextBilling) : '—' },
            { label: 'Payment terms', value: `${s.paymentTerms} days` },
            { label: 'Quotation expires', value: s.quotationExpiresAt ? formatDate(s.quotationExpiresAt) : '—' },
          ]}
        />
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold">Lines</h2>
          {linesEditable && (
            <Button variant="ghost" size="sm" onClick={() => setEditingLines(true)}>
              <PencilSimple size={14} /> Edit lines
            </Button>
          )}
        </div>
        <LinesView lines={s.lines} />
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-semibold">Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Number</th>
                <th className={th}>Date</th>
                <th className={th}>Due</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {own.length === 0 && <EmptyRow colSpan={5}>No invoices yet.</EmptyRow>}
              {own.map((invoice) => (
                <tr key={invoice.id} className={rowClass}>
                  <td className={td}>
                    <Link to={`/admin/invoices/${invoice.id}`} className="font-mono font-medium hover:underline">
                      {invoice.number}
                    </Link>
                  </td>
                  <td className={`${td} text-muted-foreground`}>{formatDate(invoice.invoiceDate)}</td>
                  <td className={`${td} text-muted-foreground`}>{formatDate(invoice.dueDate)}</td>
                  <td className={td}>
                    <StatusBadge status={invoiceDisplayStatus(invoice)} />
                  </td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(invoiceTotal(invoice))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {pending === 'renew' && plan && (
        <ConfirmDialog
          title={`Renew ${s.number}?`}
          body={`Extends the expiry by one ${plan.period.toLowerCase()} period on this subscription.`}
          confirmLabel="Renew"
          onConfirm={() => renewSubscription(s)}
          onClose={() => setPending(null)}
        />
      )}
      {pending && pending !== 'renew' && (
        <ConfirmDialog
          title={`${actionLabel(s.status, pending)} ${s.number}?`}
          body={actionBody[pending] ?? ''}
          confirmLabel={actionLabel(s.status, pending)}
          destructive={pending === 'Closed'}
          onConfirm={() => subscriptions.upsert(transition(s, pending))}
          onClose={() => setPending(null)}
        />
      )}
      {editingLines && <LinesDialog subscription={s} onClose={() => setEditingLines(false)} />}
    </>
  );
}

function LinesDialog({ subscription, onClose }: { subscription: Subscription; onClose: () => void }) {
  const [lines, setLines] = useState<Line[]>(subscription.lines);
  const [error, setError] = useState<string>();
  const plan = planStore.find(subscription.planId);

  const save = () => {
    const message = linesError(lines);
    const quantity = lines.reduce((sum, l) => sum + l.quantity, 0);
    if (message) return setError(message);
    if (plan && quantity < plan.minQuantity) {
      return setError(`${plan.name} needs a total quantity of at least ${plan.minQuantity}`);
    }
    subscriptions.upsert({ ...subscription, lines });
    onClose();
  };

  return (
    <Dialog title="Edit lines" description={subscription.number} icon={PencilSimple} wide onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <LinesEditor value={lines} onChange={setLines} error={error} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save lines</Button>
        </div>
      </div>
    </Dialog>
  );
}
