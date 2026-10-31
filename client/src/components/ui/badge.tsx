import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { SubscriptionStatus, InvoiceStatus, StatusTone } from '@/types/subscription';

const badgeVariants = cva(
  'inline-flex items-center rounded-full text-xs font-normal transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-800 border border-neutral-200/60',
        primary: 'bg-neutral-900 text-white',
        outline: 'border border-neutral-300 text-neutral-700 bg-white',
        surface: 'bg-neutral-50 text-neutral-600 border border-neutral-200',
        savings: 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium',
      },
      size: {
        default: 'h-[22px] px-2 text-[12px] leading-none',
        sm: 'h-4 px-1.5 text-[10px] leading-none',
        lg: 'h-6 px-2.5 text-[13px] leading-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

// ----------------------------------------------------------------------
// StatusBadge: Strictly adhering to DESIGN.md section "Status badge"
// ----------------------------------------------------------------------

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: SubscriptionStatus | InvoiceStatus | string;
  tone?: StatusTone;
  pulsing?: boolean;
  label?: string;
}

export function StatusBadge({
  status,
  tone: explicitTone,
  pulsing: explicitPulsing,
  label,
  className,
  ...props
}: StatusBadgeProps) {
  let tone: StatusTone = explicitTone || 'grey';
  let isPulsing = explicitPulsing || false;
  let opacityClass = '';

  const displayLabel = label || status || 'Draft';

  if (!explicitTone && status) {
    switch (status) {
      case 'Draft':
        tone = 'grey';
        isPulsing = true;
        break;
      case 'Quotation':
      case 'Confirmed':
        tone = 'blue';
        break;
      case 'Active':
      case 'Paid':
        tone = 'green';
        break;
      case 'Paused':
      case 'Outstanding':
        tone = 'yellow';
        break;
      case 'Overdue':
        tone = 'red';
        break;
      case 'Closed':
      case 'Cancelled':
        tone = 'grey';
        opacityClass = 'opacity-60';
        break;
      default:
        tone = 'grey';
    }
  }

  // Exact styles from DESIGN.md status table
  const toneStyles: Record<StatusTone, { bg: string; text: string; dot: string }> = {
    green: {
      bg: 'bg-[#f0fdf4]',
      text: 'text-[#15803d]',
      dot: 'bg-[#22c55e]',
    },
    yellow: {
      bg: 'bg-[#fefce8]',
      text: 'text-[#a16207]',
      dot: 'bg-[#eab308]',
    },
    blue: {
      bg: 'bg-[#eff6ff]',
      text: 'text-[#1d4ed8]',
      dot: 'bg-[#3b82f6]',
    },
    grey: {
      bg: 'bg-[#f5f5f5]',
      text: 'text-[#525252]',
      dot: 'bg-[#a3a3a3]',
    },
    red: {
      bg: 'bg-[#fef2f2]',
      text: 'text-[#b91c1c]',
      dot: 'bg-[#ef4444]',
    },
  };

  const current = toneStyles[tone];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 h-[22px] px-2 rounded-full text-[12px] font-normal leading-none select-none',
        current.bg,
        current.text,
        opacityClass,
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          current.dot,
          isPulsing && 'status-dot--pulse',
        )}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </div>
  );
}
