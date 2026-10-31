import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet } from 'react-router';
import { loadPortal } from '../../lib/portal';
import { cn } from '../../lib/utils';
import { Logo } from '../logo';
import { ProfileMenu } from './profile-menu';

const navItems = [
  { to: '/portal', label: 'Overview', end: true },
  { to: '/portal/subscriptions', label: 'Subscriptions', end: false },
  { to: '/portal/invoices', label: 'Invoices', end: false },
];

export function PortalLayout() {
  const [load, setLoad] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    loadPortal()
      .then(() => setLoad('ready'))
      .catch(() => setLoad('failed'));
  }, []);

  if (load === 'failed') return <Navigate to="/login" replace />;
  if (load === 'loading') {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-surface print:bg-white">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/portal" aria-label="Brightloop home">
            <Logo className="h-7" />
          </Link>
          <ProfileMenu />
        </div>

        <nav className="mx-auto flex max-w-6xl gap-5 px-4 sm:px-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  '-mb-px border-b-2 py-2.5 font-medium transition-colors duration-150',
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 print:p-0">
        <Outlet />
      </main>
    </div>
  );
}
