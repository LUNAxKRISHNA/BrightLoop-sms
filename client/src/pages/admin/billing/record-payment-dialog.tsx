import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Dialog, DialogActions, Select } from '../../../components/admin/admin-ui';
import { FormAlert } from '../../../components/auth/auth-layout';
import { fieldAria, FormField } from '../../../components/auth/form-field';
import { Input } from '../../../components/ui/input';
import {
  amountPaid,
  customers,
  invoices,
  invoiceTotal,
  payments,
  recordPayment,
  today,
  type PaymentMethod,
} from '../../../lib/billing';
import { formatMoney } from '../../../lib/portal';

export const paymentMethods: PaymentMethod[] = ['Cash', 'Bank transfer', 'Card', 'UPI', 'Other'];

const schema = z.object({
  invoiceId: z.string().min(1, 'Choose an invoice'),
  method: z.enum(['Cash', 'Bank transfer', 'Card', 'UPI', 'Other']),
  amount: z.number({ message: 'Enter an amount' }).positive('Enter an amount above zero'),
  date: z.string().min(1, 'Pick a date'),
  note: z.string().trim(),
});

type Values = z.infer<typeof schema>;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function RecordPaymentDialog({ invoiceId, onClose }: { invoiceId?: string; onClose: () => void }) {
  const allInvoices = invoices.use();
  const allPayments = payments.use();
  const [formError, setFormError] = useState<string | null>(null);
  const open = allInvoices.filter((i) => i.status === 'Confirmed');
  const balanceOf = (id: string) => {
    const invoice = allInvoices.find((i) => i.id === id);
    return invoice ? round2(invoiceTotal(invoice) - amountPaid(id, allPayments)) : 0;
  };
  const initial = invoiceId ?? '';

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceId: initial,
      method: 'UPI',
      amount: initial ? balanceOf(initial) : 0,
      date: today(),
      note: '',
    },
  });
  const selected = useWatch({ control, name: 'invoiceId' });
  const fixed = invoiceId ? allInvoices.find((i) => i.id === invoiceId) : undefined;

  const onSubmit = async (values: Values) => {
    setFormError(null);
    try {
      await recordPayment(values);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <Dialog
      title="Record payment"
      description={
        fixed ? `${fixed.number} · balance ${formatMoney(balanceOf(fixed.id))}` : 'Against a confirmed invoice.'
      }
      icon={CreditCard}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
        {formError && <FormAlert message={formError} />}

        {!invoiceId && (
          <FormField id="invoiceId" label="Invoice" error={errors.invoiceId?.message}>
            <Select
              id="invoiceId"
              {...fieldAria('invoiceId', errors.invoiceId?.message)}
              {...register('invoiceId', {
                onChange: (event) => setValue('amount', balanceOf(event.target.value)),
              })}
            >
              <option value="">Choose an invoice</option>
              {open.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.number} · {customers.find(i.customerId)?.name} · balance {formatMoney(balanceOf(i.id))}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        {selected && !invoiceId && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Balance due <span className="font-mono">{formatMoney(balanceOf(selected))}</span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="method" label="Method" error={errors.method?.message}>
            <Select id="method" {...register('method')}>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="amount" label="Amount" error={errors.amount?.message}>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              className="text-right font-mono"
              {...fieldAria('amount', errors.amount?.message)}
              {...register('amount', { valueAsNumber: true })}
            />
          </FormField>
          <FormField id="date" label="Date" error={errors.date?.message}>
            <Input id="date" type="date" {...fieldAria('date', errors.date?.message)} {...register('date')} />
          </FormField>
          <FormField id="note" label="Note">
            <Input id="note" placeholder="Optional" {...register('note')} />
          </FormField>
        </div>

        <DialogActions onCancel={onClose} submitLabel="Record payment" />
      </form>
    </Dialog>
  );
}
