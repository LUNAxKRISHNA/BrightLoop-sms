import type { ReactNode } from 'react';
import { Label } from '../ui/label';

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  labelAction?: ReactNode;
  children: ReactNode;
};

export function FormField({ id, label, error, labelAction, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-status-red-fg">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria props that link an input to its FormField error message. */
export function fieldAria(id: string, error?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  };
}
