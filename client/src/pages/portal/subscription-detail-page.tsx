import { Link, useParams } from 'react-router';
import { Card, Facts, LinesTable, PageHeader } from '../../components/portal/portal-ui';
import { StatusBadge } from '../../components/ui/status-badge';
import {
  findSubscription,
  formatDate,
  formatMoney,
  invoiceTotal,
  useInvoices,
} from '../../lib/portal';

export function SubscriptionDetailPage() {
  const { id = '' } = useParams();
  const invoices = useInvoices();
  const sub = findSubscription(id);
  const back = { to: '/portal/subscriptions', label: 'All subscriptions' };

  if (!sub) {
    return <PageHeader title="Subscription not found" back={back} />;
  }

  const related = invoices.filter((inv) => inv.subscriptionId === sub.id);

  return (
    <>
      <PageHeader
        back={back}
        title={
          <span className="inline-flex items-center gap-3">
            {sub.plan} <StatusBadge status={sub.status} />
          </span>
        }
        description={<span className="font-mono">{sub.number}</span>}
      />

      <Card>
        <Facts
          items={[
            { label: 'Billing period', value: sub.period },
            { label: 'Next bill', value: sub.nextBilling ? formatDate(sub.nextBilling) : '—' },
            { label: 'Started', value: formatDate(sub.startDate) },
            {
              label: 'Expires',
              value: sub.expiryDate ? formatDate(sub.expiryDate) : 'No end date',
            },
            { label: 'Payment terms', value: `${sub.paymentTerms} days` },
          ]}
        />
      </Card>

      <h2 className="mt-8 mb-3 text-base font-semibold">Plan lines</h2>
      <Card>
        <LinesTable lines={sub.lines} />
      </Card>

      <h2 className="mt-8 mb-3 text-base font-semibold">Invoices</h2>
      <Card className="divide-y divide-border">
        {related.map((inv) => (
          <Link
            key={inv.id}
            to={`/portal/invoices/${inv.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface"
          >
            <span className="font-mono">{inv.number}</span>
            <span className="hidden text-muted-foreground sm:inline">{formatDate(inv.issued)}</span>
            <StatusBadge status={inv.status} />
            <span className="font-mono">{formatMoney(invoiceTotal(inv))}</span>
          </Link>
        ))}
        {related.length === 0 && (
          <p className="px-4 py-8 text-center text-muted-foreground">No invoices yet.</p>
        )}
      </Card>
    </>
  );
}
