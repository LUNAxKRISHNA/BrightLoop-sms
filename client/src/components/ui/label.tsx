import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-[20px] text-neutral-900 block mb-1.5 select-none',
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-600 ml-1 font-mono">*</span>}
    </label>
  ),
);
Label.displayName = 'Label';

export { Label };
