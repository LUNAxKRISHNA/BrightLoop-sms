import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

/** Brightloop wordmark. multiply blends away the PNG's white background on tinted sections. */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="Brightloop"
      className={cn('h-7 w-auto mix-blend-multiply select-none', className)}
      draggable={false}
    />
  );
}
