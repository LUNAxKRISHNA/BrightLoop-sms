import { MagnifyingGlass, X, type Icon } from '@phosphor-icons/react';
import { useEffect, type ReactNode } from 'react';
import { canAccess, useSessionUser, type SectionKey } from '../../lib/admin';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

// Shared building blocks for the admin pages. Tables follow DESIGN.md → Tables.

export const th = 'px-5 py-2.5 font-medium';
export const td = 'px-5 py-2.5';
export const theadClass = 'border-b border-border bg-surface text-xs text-muted-foreground';
export const rowClass = 'border-b border-border last:border-0 hover:bg-muted';

/** Catalog is "View" for staff in the PRD permission matrix, even when the section is granted. */
const staffReadOnly: SectionKey[] = ['products', 'plans', 'taxes', 'discounts'];

export function useCanEdit(section: SectionKey) {
  const user = useSessionUser();
  if (!user || !canAccess(user, section)) return false;
  return user.role === 'admin' || !staffReadOnly.includes(section);
}

export function ReadOnlyNote() {
  return (
    <p className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
      View only. Ask an admin to make changes here.
    </p>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <MagnifyingGlass
        size={14}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-8 text-sm shadow-sm transition-colors duration-150 placeholder:text-muted-foreground focus:border-foreground focus:ring-3 focus:ring-ring/30 focus:outline-none"
      />
    </div>
  );
}

/** Row above a table: filters/search on the left, extra controls on the right. */
export function Toolbar({ children, aside }: { children?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {aside}
    </div>
  );
}

export function Dialog({
  title,
  description,
  icon: DialogIcon,
  onClose,
  wide,
  children,
}: {
  title: string;
  description?: string;
  icon?: Icon;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 sm:items-center">
      <div aria-hidden className="fixed inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        className={cn(
          'relative w-full rounded-dialog border border-border bg-background shadow-lg',
          wide ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="flex items-center gap-3">
            {DialogIcon && (
              <span className="flex size-9 items-center justify-center rounded-full bg-muted">
                <DialogIcon size={18} />
              </span>
            )}
            <div>
              <h2 id="admin-dialog-title" className="font-semibold">
                {title}
              </h2>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1.5 transition-colors duration-150 hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Confirmation for an action; `destructive` uses the red button (DESIGN.md → Buttons). */
export function ConfirmDialog({
  title,
  description,
  body,
  confirmLabel,
  destructive,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  body: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog title={title} description={description} onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <div className="text-muted-foreground">{body}</div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Footer row of a dialog form. */
export function DialogActions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}

/** Native select styled like Input. */
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-colors duration-150 focus:border-foreground focus:ring-3 focus:ring-ring/30 focus:outline-none aria-invalid:border-red-500',
        className,
      )}
      {...props}
    />
  );
}

export function Toggle({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      <input type="checkbox" className="size-4 accent-primary" {...props} />
    </label>
  );
}

/** Small pill for non-status labels (types, periods, flags). */
export function Tag({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        dark ? 'bg-primary text-primary-foreground' : 'bg-status-grey-bg text-status-grey-fg',
      )}
    >
      {children}
    </span>
  );
}

/** Active / Inactive pill used across catalog and team tables. */
export function ActivePill({ active, labels = ['Active', 'Inactive'] }: { active: boolean; labels?: [string, string] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        active ? 'bg-status-green-bg text-status-green-fg' : 'bg-status-grey-bg text-status-grey-fg',
      )}
    >
      <span className={cn('size-1.5 rounded-full', active ? 'bg-status-green' : 'bg-status-grey')} />
      {active ? labels[0] : labels[1]}
    </span>
  );
}
