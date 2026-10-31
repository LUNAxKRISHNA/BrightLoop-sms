import logo from '../assets/logo.png';
import { cn } from '../lib/utils';

export function Logo({ className }: { className?: string }) {
  return <img src={logo} alt="brightloop" className={cn('h-8 w-auto', className)} />;
}
