import { CaretRight } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Card, EmptyRow, FilterPills, PageHeader } from '../../components/portal/portal-ui';
import { StatusBadge } from '../../components/ui/status-badge';
import {
  formatDate,
  formatMoney,
  subscriptions,
  subscriptionTotal,
  type PortalSubscription,
} from '../../lib/mock-portal';

type Filter = 'all' | 'current' | 'ended';

const isEnded = (sub: PortalSubscription) => sub.status === 'Closed' || sub.status === 'Cancelled';

export function SubscriptionsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const ended = subscriptions.filter(isEnded);
  const current = subscriptions.filter((s) => !isEnded(s));
  const rows = filter === 'all' ? subscriptions : filter === 'current' ? current : ended;

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Plans you're subscribed to and when they bill."
      />

      <div className="mb-3">
        <FilterPills
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: subscriptions.length },
            { value: 'current', label: 'Current', count: current.length },
            { value: 'ended', label: 'Ended', count: ended.length },
          ]}
        />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Plan</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Billing</th>
              <th className="px-4 py-2.5 font-medium">Next bill</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((sub) => (
              <tr
                key={sub.id}
                className="group relative border-b border-border transition-colors duration-150 last:border-0 hover:bg-surface"
              >
                <td className="px-4 py-3">
                  {/* Stretched link makes the whole row clickable. */}
                  <Link
                    to={`/portal/subscriptions/${sub.id}`}
                    className="font-medium after:absolute after:inset-0"
                  >
                    {sub.plan}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">{sub.number}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={sub.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{sub.period}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {sub.nextBilling ? formatDate(sub.nextBilling) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatMoney(subscriptionTotal(sub))}
                </td>
                <td className="pr-4 text-muted-foreground">
                  <CaretRight
                    size={14}
                    className="transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={6}>No subscriptions here.</EmptyRow>}
          </tbody>
        </table>
      </Card>
    </>
  );
}
