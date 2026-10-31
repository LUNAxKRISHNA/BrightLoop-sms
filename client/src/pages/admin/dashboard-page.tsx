import { ArrowDownRight, ArrowUpRight } from '@phosphor-icons/react';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  BarXAxis,
  ChartTooltip,
  Grid,
  PieCenter,
  PieChart,
  PieSlice,
  XAxis,
} from '../../components/charts';
import { Card, PageHeader } from '../../components/portal/portal-ui';
import {
  fetchDashboard,
  type Dashboard,
  useSessionUser,
} from '../../lib/admin';
import { formatDate, formatMoney } from '../../lib/portal';
import { cn } from '../../lib/utils';

const compact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const formatCompact = (amount: number) => compact.format(amount);

export function DashboardPage() {
  const user = useSessionUser();
  const firstName = user?.name.split(' ')[0];
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!data) {
    return (
      <>
        <PageHeader title="Dashboard" description={error ?? 'Loading figures…'} />
      </>
    );
  }
  const { summary } = data;

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back, ${firstName}. Here's how billing looks.`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Active subscriptions"
          value={summary.activeSubscriptions.toLocaleString('en-IN')}
          change={summary.activeSubscriptionsChange}
        />
        <Stat label="MRR" value={formatCompact(summary.mrr)} change={summary.mrrChange} />
        <Stat label="Revenue invoiced" value={formatCompact(summary.revenueInvoiced)} hint="This month" />
        <Stat label="Revenue collected" value={formatCompact(summary.revenueCollected)} hint="This month" />
        <Stat label="Outstanding" value={formatCompact(summary.outstanding)} hint="Not yet due" />
        <Stat
          label="Overdue"
          value={formatCompact(summary.overdueAmount)}
          hint={`${summary.overdueCount} invoices`}
          tone="red"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <RevenueChart data={data} />
        </Card>
        <Card>
          <PlanMix data={data} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <PaidVsOutstanding data={data} />
        </Card>
        <Card className="xl:col-span-2">
          <OverdueTable data={data} />
        </Card>
      </div>

      <Card className="mt-4">
        <PaymentsTable data={data} />
      </Card>
    </>
  );
}

function Stat({
  label,
  value,
  change,
  hint,
  tone,
}: {
  label: string;
  value: string;
  change?: number;
  hint?: string;
  tone?: 'red';
}) {
  const up = (change ?? 0) >= 0;
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono text-xl font-medium', tone === 'red' && 'text-status-red-fg')}>
        {value}
      </p>
      {change !== undefined ? (
        <p
          className={cn(
            'mt-1 inline-flex items-center gap-0.5 text-xs',
            up ? 'text-status-green-fg' : 'text-status-red-fg',
          )}
        >
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(change)}% vs last month
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </Card>
  );
}

function ChartHeader({ title, description, aside }: { title: string; description: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {aside}
    </div>
  );
}

function Swatches({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

const revenueLines = [
  { key: 'invoiced', label: 'Invoiced', color: 'var(--chart-line-primary)' },
  { key: 'collected', label: 'Collected', color: 'var(--chart-line-secondary)' },
] as const;

function RevenueChart({ data }: { data: Dashboard }) {
  return (
    <div className="p-5">
      <ChartHeader
        title="Revenue over time"
        description="Invoiced vs collected, last 12 months"
        aside={<Swatches items={[...revenueLines]} />}
      />
      <div className="mt-4">
        <AreaChart data={data.revenueSeries} aspectRatio="2.8 / 1">
          <Grid horizontal numTicksRows={4} strokeDasharray="3 3" />
          {revenueLines.map((line) => (
            <Area
              key={line.key}
              dataKey={line.key}
              fill={line.color}
              stroke={line.color}
              strokeWidth={2}
              fillOpacity={0.12}
            />
          ))}
          <XAxis />
          <ChartTooltip
            rows={(point) =>
              revenueLines.map((line) => ({
                color: line.color,
                label: line.label,
                value: formatMoney(Number(point[line.key])),
              }))
            }
          />
        </AreaChart>
      </div>
    </div>
  );
}

// Status colours here because the chart is about payment status (DESIGN.md → Charts).
const paidSeries = [
  { key: 'paid', label: 'Paid', color: 'var(--color-status-green)' },
  { key: 'outstanding', label: 'Outstanding', color: 'var(--color-status-yellow)' },
] as const;

function PaidVsOutstanding({ data }: { data: Dashboard }) {
  return (
    <div className="p-5">
      <ChartHeader title="Paid vs outstanding" description="Per month, last 6 months" />
      <div className="mt-4">
        <BarChart data={data.paidVsOutstanding} xDataKey="month" stacked aspectRatio="1.5 / 1" barGap={0.4}>
          <Grid horizontal numTicksRows={4} strokeDasharray="3 3" />
          {paidSeries.map((s) => (
            <Bar key={s.key} dataKey={s.key} fill={s.color} lineCap={4} />
          ))}
          <BarXAxis />
          <ChartTooltip
            rows={(point) =>
              paidSeries.map((s) => ({
                color: s.color,
                label: s.label,
                value: formatMoney(Number(point[s.key])),
              }))
            }
          />
        </BarChart>
      </div>
      <div className="mt-3">
        <Swatches items={[...paidSeries]} />
      </div>
    </div>
  );
}

const planGreys = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

function PlanMix({ data }: { data: Dashboard }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const rows = data.subscriptionsByPlan.map((row, i) => ({ ...row, color: planGreys[i] }));

  return (
    <div className="p-5">
      <ChartHeader title="Subscriptions by plan" description="Active subscriptions" />
      <div className="mx-auto mt-4 w-full max-w-[200px]">
        <PieChart
          data={rows}
          size={200}
          innerRadius={70}
          padAngle={0.02}
          cornerRadius={4}
          hoveredIndex={hovered}
          onHoverChange={setHovered}
        >
          {rows.map((row, i) => (
            <PieSlice key={row.label} index={i} />
          ))}
          <PieCenter defaultLabel="Active" />
        </PieChart>
      </div>
      <ul className="mt-4 space-y-1.5">
        {rows.map((row, i) => (
          <li
            key={row.label}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered(null)}
            className={cn(
              'flex items-center justify-between gap-3 rounded-md px-1.5 py-0.5 transition-colors duration-150',
              hovered === i && 'bg-muted',
            )}
          >
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: row.color }} />
              {row.label}
            </span>
            <span className="font-mono text-muted-foreground">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const th = 'px-5 py-2.5 font-medium';
const td = 'px-5 py-2.5';

function OverdueTable({ data }: { data: Dashboard }) {
  return (
    <>
      <div className="p-5 pb-3">
        <ChartHeader title="Overdue invoices" description={`${data.summary.overdueCount} invoices past due`} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead className="border-y border-border bg-surface text-xs text-muted-foreground">
            <tr>
              <th className={th}>Invoice</th>
              <th className={th}>Customer</th>
              <th className={th}>Due</th>
              <th className={cn(th, 'text-right')}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.overdueInvoices.map((inv) => (
              <tr key={inv.number} className="border-b border-border last:border-0 hover:bg-muted">
                <td className={cn(td, 'font-mono')}>{inv.number}</td>
                <td className={td}>{inv.customer}</td>
                <td className={cn(td, 'text-status-red-fg')}>{formatDate(inv.due)}</td>
                <td className={cn(td, 'text-right font-mono')}>{formatMoney(inv.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PaymentsTable({ data }: { data: Dashboard }) {
  return (
    <>
      <div className="p-5 pb-3">
        <ChartHeader title="Recent payments" description="Last 5 payments recorded" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead className="border-y border-border bg-surface text-xs text-muted-foreground">
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Customer</th>
              <th className={th}>Method</th>
              <th className={cn(th, 'text-right')}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.recentPayments.map((payment, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted">
                <td className={td}>{formatDate(payment.date)}</td>
                <td className={td}>{payment.customer}</td>
                <td className={cn(td, 'text-muted-foreground')}>{payment.method}</td>
                <td className={cn(td, 'text-right font-mono')}>{formatMoney(payment.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
