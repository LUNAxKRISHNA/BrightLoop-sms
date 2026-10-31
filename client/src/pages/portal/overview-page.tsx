import { ArrowRight, CaretRight, WarningCircle } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BillingHistoryChart, SpendByPlan } from '../../components/portal/billing-charts';
import { usePayFlow } from '../../components/portal/invoice-action';
import { Card } from '../../components/portal/portal-ui';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/status-badge';
import {
  amountPaid,
  customer,
  formatDate,
  formatMoney,
  invoiceTotal,
  subscriptions,
  subscriptionTotal,
  useInvoices,
} from '../../lib/mock-portal';
import { cn } from '../../lib/utils';

function SummaryItem({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: ReactNode;
  hint: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="p-5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p
        className={cn(
          'mt-2 font-mono text-2xl font-medium tracking-tight',
          danger && 'text-status-red-fg',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold">{title}</h2>
      <Link
        to={to}
        className="inline-flex items-center gap-1 text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        View all <ArrowRight size={14} />
      </Link>
    </div>
  );
}

const rowLink =
  'flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface group';

export function OverviewPage() {
  const invoices = useInvoices();
  const { openPay, dialog } = usePayFlow();
  const current = subscriptions.filter((s) => s.status !== 'Closed' && s.status !== 'Cancelled');
  const active = current.filter((s) => s.status === 'Active');
  const next = current
    .filter((s) => s.nextBilling)
    .sort((a, b) => a.nextBilling!.localeCompare(b.nextBilling!))[0];
  const overdue = invoices.filter((i) => i.status === 'Overdue');
  const unpaid = invoices.filter((i) => i.status === 'Overdue' || i.status === 'Outstanding');
  const balance = (list: typeof invoices) =>
    list.reduce((sum, i) => sum + invoiceTotal(i) - amountPaid(i), 0);

  return (
    <>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Hi {customer.name.split(' ')[0]}</h1>
        <p className="mt-1 text-muted-foreground">
          {active.length} active subscriptions
          {next?.nextBilling && <> · next bill on {formatDate(next.nextBilling)}</>}
        </p>
      </div>

      {overdue.length > 0 && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-status-red/20 bg-status-red-bg px-4 py-3 text-status-red-fg"
        >
          <WarningCircle size={18} className="shrink-0" />
          <p className="flex-1">
            <span className="font-medium">
              {overdue.length === 1
                ? `Invoice ${overdue[0].number} is overdue.`
                : `${overdue.length} invoices are overdue.`}
            </span>{' '}
            {formatMoney(balance(overdue))} was due on {formatDate(overdue[0].due)}.
          </p>
          <Link
            to={overdue.length === 1 ? `/portal/invoices/${overdue[0].id}` : '/portal/invoices'}
            className="font-medium underline-offset-4 hover:underline"
          >
            View invoice
          </Link>
          {overdue.length === 1 && (
            <Button size="sm" variant="destructive" onClick={() => openPay(overdue[0])}>
              Pay now
            </Button>
          )}
        </div>
      )}
      {dialog}

      {/* One billing summary panel instead of separate metric cards. */}
      <Card className="mt-4 grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <SummaryItem
          label="Balance due"
          value={formatMoney(balance(unpaid))}
          danger={overdue.length > 0}
          hint={`${unpaid.length} unpaid invoices`}
        />
        <SummaryItem
          label="Next payment"
          value={next ? formatMoney(subscriptionTotal(next)) : '—'}
          hint={
            next?.nextBilling ? `${next.plan} · ${formatDate(next.nextBilling)}` : 'Nothing due'
          }
        />
        <SummaryItem
          label="Subscriptions"
          value={`${active.length} active`}
          hint={`${current.length - active.length} starting soon · ${subscriptions.length} in total`}
        />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <BillingHistoryChart />
        </Card>
        <Card>
          <SpendByPlan />
        </Card>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeader title="Your subscriptions" to="/portal/subscriptions" />
          <Card className="divide-y divide-border">
            {current.map((sub) => (
              <Link key={sub.id} to={`/portal/subscriptions/${sub.id}`} className={rowLink}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{sub.plan}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.nextBilling ? `Next bill ${formatDate(sub.nextBilling)}` : 'Ended'}
                  </p>
                </div>
                <StatusBadge status={sub.status} />
                <span className="w-24 text-right font-mono">
                  {formatMoney(subscriptionTotal(sub))}
                </span>
                <CaretRight
                  size={14}
                  className="text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </Card>
        </section>

        <section>
          <SectionHeader title="Recent invoices" to="/portal/invoices" />
          <Card className="divide-y divide-border">
            {invoices.slice(0, 4).map((inv) => (
              <Link key={inv.id} to={`/portal/invoices/${inv.id}`} className={rowLink}>
                <div className="min-w-0 flex-1">
                  <p className="font-mono">{inv.number}</p>
                  <p className="text-xs text-muted-foreground">Due {formatDate(inv.due)}</p>
                </div>
                <StatusBadge status={inv.status} />
                <span className="w-24 text-right font-mono">{formatMoney(invoiceTotal(inv))}</span>
                <CaretRight
                  size={14}
                  className="text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </>
  );
}
