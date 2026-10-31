import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '../logo';

type AuthLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <Link to="/" aria-label="Brightloop home" className="mb-8">
        <Logo className="h-16" />
      </Link>
      <div className="w-full max-w-[400px] rounded-card border border-border bg-background p-6 shadow-sm">
        {children}
      </div>
      {footer && <p className="mt-6 text-muted-foreground">{footer}</p>}
    </main>
  );
}

export function AuthHeader({ title, description }: { title: string; description: string }) {
  return (
    <>
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </>
  );
}

export function FormAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-6 flex items-start gap-2 rounded-lg bg-status-red-bg px-3 py-2.5 text-status-red-fg"
    >
      <WarningCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

type AuthSuccessProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

export function AuthSuccess({ title, children, action }: AuthSuccessProps) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <CheckCircle size={32} className="text-status-green-fg" />
      <h1 className="mt-3 text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-muted-foreground">{children}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
