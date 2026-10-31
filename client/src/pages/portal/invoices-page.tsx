import { useState } from 'react';
import { Link } from 'react-router';
import { CaretRight } from '@phosphor-icons/react';
import { Card, EmptyRow, FilterPills, PageHeader } from '../../components/portal/portal-ui';
import { StatusBadge } from '../../components/ui/status-badge';
import {
  findSubscription,
  formatDate,
  formatMoney,
  invoiceTotal,
  useInvoices,
} from '../../lib/portal';
import { cn } from '../../lib/utils';

type Filter = 'all' | 'Outstanding' | 'Overdue' | 'Paid';

export function InvoicesPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const invoices = useInvoices();
  const count = (status: Filter) => invoices.filter((i) => i.status === status).length;
  const rows = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Your billing history. Open an invoice to pay or print it."
      />

      <div className="mb-3">
        <FilterPills
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: invoices.length },
            { value: 'Outstanding', label: 'Outstanding', count: count('Outstanding') },
            { value: 'Overdue', label: 'Overdue', count: count('Overdue') },
            { value: 'Paid', label: 'Paid', count: count('Paid') },
          ]}
        />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Invoice</th>
              <th className="px-4 py-2.5 font-medium">Plan</th>
              <th className="px-4 py-2.5 font-medium">Issued</th>
              <th className="px-4 py-2.5 font-medium">Due</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr
                key={inv.id}
                className="group relative border-b border-border transition-colors duration-150 last:border-0 hover:bg-surface"
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/portal/invoices/${inv.id}`}
                    className="font-mono after:absolute after:inset-0"
                  >
                    {inv.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{findSubscription(inv.subscriptionId)?.plan}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.issued)}</td>
                <td
                  className={cn(
                    'px-4 py-3',
                    inv.status === 'Overdue' ? 'text-status-red-fg' : 'text-muted-foreground',
                  )}
                >
                  {formatDate(inv.due)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatMoney(invoiceTotal(inv))}</td>
                <td className="pr-4 text-muted-foreground">
                  <CaretRight
                    size={14}
                    className="transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={7}>No invoices here.</EmptyRow>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
