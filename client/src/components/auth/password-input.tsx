import { Eye, EyeSlash } from '@phosphor-icons/react';
import { useState, type ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';

export function PasswordInput({ className, ...props }: ComponentProps<typeof Input>) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <Input type={shown ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
      <button
        type="button"
        onClick={() => setShown((value) => !value)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        {shown ? <EyeSlash size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
