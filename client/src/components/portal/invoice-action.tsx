import { useState } from 'react';
import { useNavigate } from 'react-router';
import { type PortalInvoice } from '../../lib/portal';
import { PayDialog } from './pay-dialog';

/** Opens the printable invoice page, which prints itself on load. */
export function usePrintInvoice() {
  const navigate = useNavigate();
  return (invoice: PortalInvoice) => navigate(`/portal/invoices/${invoice.id}?print=1`);
}

/** Page-level pay state plus the dialog to render once. */
export function usePayFlow() {
  const [target, setTarget] = useState<PortalInvoice | null>(null);
  const print = usePrintInvoice();
  const dialog = (
    <PayDialog
      invoice={target}
      onClose={() => setTarget(null)}
      onPrint={(invoice) => {
        setTarget(null);
        print(invoice);
      }}
    />
  );
  return { openPay: setTarget, dialog };
}
