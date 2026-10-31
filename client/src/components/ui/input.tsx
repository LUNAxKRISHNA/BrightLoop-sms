import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors duration-150 ease-out placeholder:text-muted-foreground focus:border-foreground focus:ring-3 focus:ring-ring/30 focus:outline-none aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/20 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
