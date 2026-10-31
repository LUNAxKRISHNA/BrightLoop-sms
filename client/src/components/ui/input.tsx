import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:border-neutral-900 focus-visible:ring-[3px] focus-visible:ring-neutral-400/30 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus-visible:border-red-600 focus-visible:ring-red-400/20',
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-700 font-normal">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
