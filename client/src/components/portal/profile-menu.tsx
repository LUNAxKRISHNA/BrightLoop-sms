import { CaretDown, SignOut, UserCircle } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { customer } from '../../lib/mock-portal';
import { cn } from '../../lib/utils';

const initials = customer.name
  .split(' ')
  .map((part) => part[0])
  .join('');

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full border border-border p-0.5 pr-2 transition-colors duration-150 hover:bg-muted"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {initials}
        </span>
        <CaretDown
          size={12}
          className={cn(
            'text-muted-foreground transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        role="menu"
        className={cn(
          'absolute right-0 mt-2 w-60 origin-top-right rounded-card border border-border bg-background p-1 shadow-lg transition duration-150 ease-out',
          open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        <div className="px-3 py-2">
          <p className="font-medium">{customer.name}</p>
          <p className="truncate text-xs text-muted-foreground">{customer.email}</p>
        </div>
        <div className="my-1 h-px bg-border" />
        <Link
          to="/portal/profile"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 transition-colors duration-150 hover:bg-muted"
        >
          <UserCircle size={16} />
          Profile
        </Link>
        <Link
          to="/login"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 transition-colors duration-150 hover:bg-muted"
        >
          <SignOut size={16} />
          Sign out
        </Link>
      </div>
    </div>
  );
}
