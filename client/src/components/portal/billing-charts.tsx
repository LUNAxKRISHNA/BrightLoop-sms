import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  BarXAxis,
  ChartTooltip,
  Grid,
  PieCenter,
  PieChart,
  PieSlice,
} from '../charts';
import {
  formatMoney,
  invoices,
  invoiceTotal,
  subscriptions,
  subscriptionTotal,
  type BillingPeriod,
} from '../../lib/mock-portal';
import { cn } from '../../lib/utils';

// Bklit charts. Grey by default; status colours only where the chart is about
// payment status (DESIGN.md, Charts).

const MONTHS = 6;

const series = [
  { key: 'paid', label: 'Paid', color: 'var(--chart-3)' },
  { key: 'outstanding', label: 'Outstanding', color: 'var(--color-status-yellow)' },
  { key: 'overdue', label: 'Overdue', color: 'var(--color-status-red)' },
] as const;

function lastMonths(count: number, from = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() - (count - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
    };
  });
}

export function BillingHistoryChart() {
  const data = useMemo(
    () =>
      lastMonths(MONTHS).map(({ key, month }) => {
        const inMonth = invoices.filter((inv) => inv.issued.startsWith(key));
        const sum = (status: string) =>
          inMonth.filter((i) => i.status === status).reduce((s, i) => s + invoiceTotal(i), 0);
        return {
          month,
          paid: sum('Paid'),
          outstanding: sum('Outstanding'),
          overdue: sum('Overdue'),
        };
      }),
    [],
  );
  const billed = data.reduce((s, d) => s + d.paid + d.outstanding + d.overdue, 0);

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Billing history</h2>
          <p className="text-xs text-muted-foreground">Invoiced per month, last {MONTHS} months</p>
        </div>
        <p className="text-right">
          <span className="block font-mono text-lg font-medium">{formatMoney(billed)}</span>
          <span className="text-xs text-muted-foreground">billed</span>
        </p>
      </div>

      <div className="mt-4">
        <BarChart data={data} xDataKey="month" stacked aspectRatio="2.6 / 1" barGap={0.45}>
          <Grid horizontal numTicksRows={4} strokeDasharray="3 3" />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} fill={s.color} lineCap={4} />
          ))}
          <BarXAxis />
          <ChartTooltip
            rows={(point) =>
              series
                .filter((s) => Number(point[s.key]) > 0)
                .map((s) => ({
                  color: s.color,
                  label: s.label,
                  value: formatMoney(Number(point[s.key])),
                }))
            }
          />
        </BarChart>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Monthly equivalent, same formula as the admin MRR (PRD 4.9).
const toMonthly = (amount: number, period: BillingPeriod) =>
  period === 'Yearly' ? amount / 12 : period === 'Weekly' ? (amount * 52) / 12 : amount;

const pieGreys = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-2)'];

export function SpendByPlan() {
  const [hovered, setHovered] = useState<number | null>(null);
  const rows = subscriptions
    .filter((s) => s.status === 'Active' || s.status === 'Confirmed')
    .map((s, i) => ({
      id: s.id,
      label: s.plan,
      value: Math.round(toMonthly(subscriptionTotal(s), s.period)),
      color: pieGreys[i % pieGreys.length],
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="p-5">
      <h2 className="font-semibold">Monthly spend by plan</h2>
      <p className="text-xs text-muted-foreground">Yearly plans shown per month</p>

      <div className="mx-auto mt-4 w-full max-w-[200px]">
        <PieChart
          data={rows}
          size={200}
          innerRadius={72}
          padAngle={0.02}
          cornerRadius={4}
          hoveredIndex={hovered}
          onHoverChange={setHovered}
        >
          {rows.map((row, i) => (
            <PieSlice key={row.id} index={i} />
          ))}
          <PieCenter defaultLabel="per month" prefix="₹" />
        </PieChart>
      </div>

      <ul className="mt-4 flex flex-col gap-1">
        {rows.map((row, i) => (
          <li
            key={row.id}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              'flex items-center justify-between rounded-md px-2 py-1 text-xs transition-colors duration-150',
              hovered === i && 'bg-muted',
            )}
          >
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: row.color }} />
              {row.label}
            </span>
            <span className="font-mono text-muted-foreground">{formatMoney(row.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
