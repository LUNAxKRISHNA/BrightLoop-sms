import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs subcomponents must be used within <Tabs>');
  }
  return context;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : internalValue;

  const handleValueChange = React.useCallback(
    (newVal: string) => {
      if (!isControlled) {
        setInternalValue(newVal);
      }
      onValueChange?.(newVal);
    },
    [isControlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'pill' | 'underline' | 'default';
}

export function TabsList({ className, children, variant = 'default', ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center p-1 bg-neutral-100 text-neutral-500 rounded-lg select-none',
        variant === 'pill' && 'rounded-full bg-neutral-100 p-1',
        className,
      )}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  pill?: boolean;
}

export function TabsTrigger({
  className,
  value,
  pill = false,
  children,
  ...props
}: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = useTabs();
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-xs font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        pill ? 'rounded-full' : 'rounded-md',
        isActive
          ? 'bg-white text-neutral-900 shadow-[0_1px_2px_rgb(0_0_0/0.05)] font-semibold'
          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const { value: activeValue } = useTabs();
  if (activeValue !== value) return null;

  return (
    <div role="tabpanel" className={cn('mt-3 focus-visible:outline-none', className)} {...props}>
      {children}
    </div>
  );
}
