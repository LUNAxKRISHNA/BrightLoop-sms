import {
  CaretUpDown,
  ChartPieSlice,
  CreditCard,
  LockSimple,
  FileText,
  List,
  Package,
  Percent,
  Receipt,
  Repeat,
  SignOut,
  SquaresFour,
  Tag,
  UserGear,
  Users,
  X,
  type Icon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  canAccess,
  sections,
  signOutStaffArea,
  useSessionUser,
  type SectionKey,
  type SessionUser,
  loadSessionUser,
  loadStaff,
} from '../../lib/admin';
import { loadBilling } from '../../lib/billing';
import { cn } from '../../lib/utils';
import { Logo } from '../logo';

const icons: Record<SectionKey, Icon> = {
  dashboard: SquaresFour,
  customers: Users,
  subscriptions: Repeat,
  templates: FileText,
  invoices: Receipt,
  payments: CreditCard,
  products: Package,
  plans: ChartPieSlice,
  taxes: Percent,
  discounts: Tag,
  staff: UserGear,
};

const groups: { label: string; keys: SectionKey[] }[] = [
  { label: 'Overview', keys: ['dashboard'] },
  { label: 'Sales', keys: ['customers', 'subscriptions', 'templates'] },
  { label: 'Billing', keys: ['invoices', 'payments'] },
  { label: 'Catalog', keys: ['products', 'plans', 'taxes', 'discounts'] },
  { label: 'Settings', keys: ['staff'] },
];

/** Section whose route matches the current path (longest match wins, so /admin isn't everything). */
function sectionForPath(pathname: string) {
  return [...sections]
    .sort((a, b) => b.to.length - a.to.length)
    .find((s) => pathname === s.to || pathname.startsWith(`${s.to}/`));
}

export function AdminLayout() {
  const user = useSessionUser();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [load, setLoad] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => setMobileOpen(false), [pathname]);

  // Who is signed in, then everything the admin pages read.
  useEffect(() => {
    loadSessionUser()
      .then(() => Promise.all([loadBilling(), loadStaff()]))
      .then(() => setLoad('ready'))
      .catch(() => setLoad('failed'));
  }, []);

  if (load === 'failed') return <Navigate to="/login" replace />;
  if (load === 'loading' || !user) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  // Staff who open a section they weren't granted go to the first one they have.
  const current = sectionForPath(pathname);
  if (current && !canAccess(user, current.key)) {
    const first = sections.find((s) => canAccess(user, s.key));
    return first ? <Navigate to={first.to} replace /> : <NoAccess />;
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Mobile top strip: just enough to open the sidebar. */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <Link to="/admin" aria-label="Brightloop home">
          <Logo className="h-6" />
        </Link>
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 transition-colors duration-150 hover:bg-muted"
        >
          <List size={20} />
        </button>
      </div>

      {mobileOpen && (
        <div
          aria-hidden
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-surface transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <Link to="/admin" aria-label="Brightloop home">
            <Logo className="h-6" />
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 transition-colors duration-150 hover:bg-muted lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((group) => {
            const items = sections.filter(
              (s) => group.keys.includes(s.key) && canAccess(user, s.key),
            );
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="mt-4 first:mt-1">
                <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                  {group.label}
                </p>
                {items.map((item) => {
                  const ItemIcon = icons[item.key];
                  return (
                    <NavLink
                      key={item.key}
                      to={item.to}
                      end={item.key === 'dashboard'}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-150',
                          isActive
                            ? 'bg-background font-medium text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <ItemIcon size={16} weight={isActive ? 'fill' : 'regular'} />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <UserMenu user={user} />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function UserMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('');

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
    <div ref={ref} className="relative border-t border-border p-3">
      <div
        role="menu"
        className={cn(
          'absolute inset-x-3 bottom-full mb-1 origin-bottom rounded-card border border-border bg-background p-1 shadow-lg transition duration-150 ease-out',
          open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
        )}
      >
        <button
          type="button"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            signOutStaffArea();
            navigate('/login');
          }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 transition-colors duration-150 hover:bg-muted"
        >
          <SignOut size={16} />
          Sign out
        </button>
      </div>

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors duration-150 hover:bg-muted"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground capitalize">
            {user.role}
          </span>
        </span>
        <CaretUpDown size={14} className="text-muted-foreground" />
      </button>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-surface p-6 text-center">
      <LockSimple size={32} className="text-muted-foreground" />
      <p className="font-medium">No sections assigned yet</p>
      <p className="text-muted-foreground">Ask an admin to give you access.</p>
      <Link
        to="/login"
        onClick={signOutStaffArea}
        className="mt-2 font-medium hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
