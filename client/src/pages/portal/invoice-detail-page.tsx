import { ArrowLeft, Printer } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Logo } from '../../components/logo';
import { usePayFlow } from '../../components/portal/invoice-action';
import { Card, LinesTable, PageHeader } from '../../components/portal/portal-ui';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/status-badge';
import {
  amountPaid,
  customer,
  findInvoice,
  findSubscription,
  formatDate,
  formatMoney,
  invoiceTotal,
  isUnpaid,
  useInvoices,
} from '../../lib/portal';

/** Thin edge strip repeating the invoice number, like a security band on a bill. */
function NumberStrip({ number }: { number: string }) {
  return (
    <div
      aria-hidden
      className="overflow-hidden bg-primary py-1 font-mono text-[9px] leading-none tracking-[0.2em] whitespace-nowrap text-primary-foreground/70 select-none"
    >
      {Array.from({ length: 30 }, () => number).join('  ·  ')}
    </div>
  );
}

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  useInvoices(); // re-render after a payment
  const inv = findInvoice(id);
  const back = { to: '/portal/invoices', label: 'All invoices' };
  const { openPay, dialog } = usePayFlow();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoPrint = searchParams.get('print') === '1' && !!inv && !isUnpaid(inv);

  // Print buttons elsewhere link here with ?print=1.
  useEffect(() => {
    if (!autoPrint) return;
    setSearchParams({}, { replace: true });
    const frame = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(frame);
  }, [autoPrint, setSearchParams]);

  if (!inv) {
    return <PageHeader title="Invoice not found" back={back} />;
  }

  const sub = findSubscription(inv.subscriptionId);
  const total = invoiceTotal(inv);
  const balance = total - amountPaid(inv);
  const { billing } = customer;

  return (
    <>
      {/* Toolbar aligned to the sheet; the invoice number lives on the sheet itself. */}
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 print:hidden">
        <Link
          to={back.to}
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ArrowLeft size={14} /> {back.label}
        </Link>
        {isUnpaid(inv) ? (
          <Button size="sm" onClick={() => openPay(inv)}>
            Pay {formatMoney(balance)}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={16} /> Print invoice
          </Button>
        )}
      </div>
      {dialog}

      {/* The printable document. Print styles hide everything else. */}
      <Card className="invoice-sheet mx-auto max-w-3xl overflow-hidden print:border-0 print:shadow-none">
        <NumberStrip number={inv.number} />
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <Logo className="h-8" />
            <p className="mt-3 text-xs text-muted-foreground">Brightloop · Bengaluru, Karnataka</p>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Invoice</p>
            <p className="font-mono text-lg font-medium">{inv.number}</p>
            <div className="mt-1">
              <StatusBadge status={inv.status} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 border-y border-border px-6 py-5 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Billed to</p>
            <p className="mt-1 font-medium">{customer.name}</p>
            <p className="text-muted-foreground">
              {customer.company && (
                <>
                  {customer.company}
                  <br />
                </>
              )}
              {billing.address}
              <br />
              {billing.city}, {billing.state} {billing.postalCode}
              <br />
              {customer.email}
            </p>
            {billing.gstin && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">GSTIN {billing.gstin}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subscription</p>
            <p className="mt-1 font-medium">{sub?.plan}</p>
            <p className="font-mono text-muted-foreground">{sub?.number}</p>
          </div>
          <div className="grid grid-cols-2 gap-y-1 sm:text-right">
            <span className="text-muted-foreground sm:col-span-2 sm:text-xs">Issued</span>
            <span className="sm:col-span-2">{formatDate(inv.issued)}</span>
            <span className="text-muted-foreground sm:col-span-2 sm:mt-2 sm:text-xs">Due</span>
            <span
              className={
                inv.status === 'Overdue' ? 'text-status-red-fg sm:col-span-2' : 'sm:col-span-2'
              }
            >
              {formatDate(inv.due)}
            </span>
          </div>
        </div>

        <LinesTable lines={inv.lines} />

        <div className="border-t border-border px-6 py-5">
          <h2 className="font-semibold">Payments</h2>
          {inv.payments.length > 0 ? (
            <ul className="mt-2 divide-y divide-border">
              {inv.payments.map((p) => (
                <li key={p.date} className="flex justify-between py-2">
                  <span className="text-muted-foreground">
                    {formatDate(p.date)} · {p.method}
                  </span>
                  <span className="font-mono">{formatMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted-foreground">No payments recorded yet.</p>
          )}
          <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
            <span>Balance due</span>
            <span
              className={
                balance > 0 && inv.status === 'Overdue'
                  ? 'font-mono text-status-red-fg'
                  : 'font-mono'
              }
            >
              {formatMoney(balance)}
            </span>
          </div>
        </div>

        <footer className="border-t border-border px-6 py-5 text-xs text-muted-foreground print:break-inside-avoid">
          {balance > 0 ? (
            <p>
              Please pay {formatMoney(balance)} by {formatDate(inv.due)}
              {sub && <> ({sub.paymentTerms}-day payment terms)</>}. Quote{' '}
              <span className="font-mono text-foreground">{inv.number}</span> with your payment.
            </p>
          ) : (
            <p>Paid in full. Thank you for your business.</p>
          )}
          <p className="mt-1">
            Prices include GST as shown per line. Questions about this invoice? Write to{' '}
            <span className="text-foreground">billing@brightloop.in</span>.
          </p>
          <p className="mt-4 border-t border-dashed border-border pt-3 text-center">
            This is a system-generated invoice and does not require a signature.
          </p>
        </footer>
        <NumberStrip number={inv.number} />
      </Card>
    </>
  );
}
