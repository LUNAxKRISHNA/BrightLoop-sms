import { ArrowLeft } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { formatMoney, totals, type Line } from '../../lib/mock-portal';
import { cn } from '../../lib/utils';

export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1.5 text-muted-foreground transition-colors duration-150 hover:text-foreground print:hidden"
        >
          <ArrowLeft size={14} /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {description && <div className="mt-1 text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex gap-2 print:hidden">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-card border border-border bg-background shadow-sm', className)}>
      {children}
    </div>
  );
}

/** Label/value grid used for subscription and invoice facts. */
export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Product lines with subtotal, tax and total. */
export function LinesTable({ lines }: { lines: Line[] }) {
  const { subtotal, tax, total } = totals(lines);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left">
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            <th className="px-5 py-2.5 font-medium">Product</th>
            <th className="px-5 py-2.5 text-right font-medium">Qty</th>
            <th className="px-5 py-2.5 text-right font-medium">Unit price</th>
            <th className="px-5 py-2.5 text-right font-medium">Tax</th>
            <th className="px-5 py-2.5 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.product} className="border-b border-border">
              <td className="px-5 py-2.5">{line.product}</td>
              <td className="px-5 py-2.5 text-right font-mono">{line.quantity}</td>
              <td className="px-5 py-2.5 text-right font-mono">{formatMoney(line.unitPrice)}</td>
              <td className="px-5 py-2.5 text-right text-muted-foreground">{line.taxRate}%</td>
              <td className="px-5 py-2.5 text-right font-mono">
                {formatMoney(line.quantity * line.unitPrice)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="font-mono">
          <tr>
            <td colSpan={4} className="px-5 pt-3 text-right font-sans text-muted-foreground">
              Subtotal
            </td>
            <td className="px-5 pt-3 text-right">{formatMoney(subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="px-5 pt-1 text-right font-sans text-muted-foreground">
              Tax
            </td>
            <td className="px-5 pt-1 text-right">{formatMoney(tax)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="px-5 pt-1 pb-4 text-right font-sans font-semibold">
              Total
            </td>
            <td className="px-5 pt-1 pb-4 text-right text-base font-semibold">
              {formatMoney(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Pill filter tabs (All / Paid / ...). */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150',
            value === option.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
          <span className="font-mono opacity-70">{option.count}</span>
        </button>
      ))}
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
