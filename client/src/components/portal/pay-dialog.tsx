import { Bank, CheckCircle, CreditCard, QrCode, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import {
  amountPaid,
  formatDate,
  formatMoney,
  invoiceTotal,
  payInvoice,
  type PaymentMethod,
  type PortalInvoice,
} from '../../lib/portal';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const methods: { value: PaymentMethod; label: string; icon: typeof Bank }[] = [
  { value: 'UPI', label: 'UPI', icon: QrCode },
  { value: 'Card', label: 'Card', icon: CreditCard },
  { value: 'Net banking', label: 'Net banking', icon: Bank },
];

type PayDialogProps = {
  invoice: PortalInvoice | null;
  onClose: () => void;
  onPrint: (invoice: PortalInvoice) => void;
};

/** Checkout dialog (no real gateway, PRD). Uses the native <dialog> for focus trapping and Escape. */
export function PayDialog({ invoice, onClose, onPrint }: PayDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState<PortalInvoice | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (invoice && !dialog.open) {
      setPaid(null);
      setPaying(false);
      dialog.showModal();
    }
    if (!invoice && dialog.open) dialog.close();
  }, [invoice]);

  const shown = paid ?? invoice;
  const balance = shown ? invoiceTotal(shown) - amountPaid(shown) : 0;

  const pay = async () => {
    if (!invoice) return;
    setPaying(true);
    try {
      await payInvoice(invoice.id, method);
      setPaid(invoice);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Payment failed. Try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => paying && event.preventDefault()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-dialog border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/30"
    >
      {shown && paid ? (
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <CheckCircle size={36} className="text-status-green-fg" />
          <h2 className="mt-3 text-lg font-semibold">Payment received</h2>
          <p className="mt-1 text-muted-foreground">
            {/* `paid` is the invoice as it was before paying, so balance is what was paid. */}
            {formatMoney(balance)} paid for <span className="font-mono">{shown.number}</span> via{' '}
            {method}.
          </p>
          <div className="mt-6 flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
            <Button onClick={() => onPrint(shown)}>Print invoice</Button>
          </div>
        </div>
      ) : (
        shown && (
          <>
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-semibold">Pay invoice</h2>
                <p className="font-mono text-xs text-muted-foreground">
                  {shown.number} · due {formatDate(shown.due)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                disabled={paying}
                className="rounded-full p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="text-xs text-muted-foreground">Amount to pay</p>
              <p className="mt-1 font-mono text-3xl font-medium tracking-tight">
                {formatMoney(balance)}
              </p>

              <fieldset className="mt-5">
                <legend className="mb-2 text-xs text-muted-foreground">Payment method</legend>
                <div className="grid grid-cols-3 gap-2">
                  {methods.map(({ value, label, icon: Icon }) => (
                    <label
                      key={value}
                      className={cn(
                        'flex cursor-pointer flex-col items-center gap-1.5 rounded-card border px-2 py-3 text-xs font-medium transition-colors duration-150 has-focus-visible:ring-3 has-focus-visible:ring-ring/30',
                        method === value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-muted',
                      )}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={value}
                        checked={method === value}
                        onChange={() => setMethod(value)}
                        className="sr-only"
                      />
                      <Icon size={20} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex justify-end gap-2 border-t border-border bg-surface px-5 py-3">
              <Button variant="secondary" onClick={onClose} disabled={paying}>
                Cancel
              </Button>
              <Button onClick={pay} disabled={paying}>
                {paying ? 'Processing…' : `Pay ${formatMoney(balance)}`}
              </Button>
            </div>
          </>
        )
      )}
    </dialog>
  );
}
