import { cn } from '../../lib/utils';

export type Status =
  | 'Draft'
  | 'Quotation'
  | 'Confirmed'
  | 'Active'
  | 'Paused'
  | 'Closed'
  | 'Cancelled'
  | 'Paid'
  | 'Outstanding'
  | 'Overdue';

type Tone = 'green' | 'yellow' | 'blue' | 'grey' | 'red';

// Status → tone mapping from DESIGN.md.
const tones: Record<Status, Tone> = {
  Draft: 'grey',
  Quotation: 'blue',
  Confirmed: 'blue',
  Active: 'green',
  Paused: 'yellow',
  Closed: 'grey',
  Cancelled: 'grey',
  Paid: 'green',
  Outstanding: 'yellow',
  Overdue: 'red',
};

const toneClasses: Record<Tone, { badge: string; dot: string }> = {
  green: { badge: 'bg-status-green-bg text-status-green-fg', dot: 'bg-status-green' },
  yellow: { badge: 'bg-status-yellow-bg text-status-yellow-fg', dot: 'bg-status-yellow' },
  blue: { badge: 'bg-status-blue-bg text-status-blue-fg', dot: 'bg-status-blue' },
  grey: { badge: 'bg-status-grey-bg text-status-grey-fg', dot: 'bg-status-grey' },
  red: { badge: 'bg-status-red-bg text-status-red-fg', dot: 'bg-status-red' },
};

export function StatusBadge({ status }: { status: Status }) {
  const tone = toneClasses[tones[status]];
  const hollow = status === 'Closed' || status === 'Cancelled';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        tone.badge,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          hollow ? 'border-[1.5px] border-status-grey' : tone.dot,
          status === 'Draft' && 'animate-status-pulse',
        )}
      />
      {status}
    </span>
  );
}
