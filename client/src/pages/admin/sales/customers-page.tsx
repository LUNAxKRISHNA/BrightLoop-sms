import { zodResolver } from '@hookform/resolvers/zod';
import { AddressBook, PencilSimple, Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import {
  Dialog,
  DialogActions,
  ReadOnlyNote,
  rowClass,
  SearchInput,
  td,
  th,
  theadClass,
  Toolbar,
  useCanEdit,
} from '../../../components/admin/admin-ui';
import { fieldAria, FormField } from '../../../components/auth/form-field';
import { Card, EmptyRow, PageHeader } from '../../../components/portal/portal-ui';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { emailSchema } from '../../../lib/auth-schemas';
import {
  amountPaid,
  customers,
  invoices as invoiceStore,
  invoiceTotal,
  newId,
  payments as paymentStore,
  subscriptions as subscriptionStore,
  today,
  type Customer,
} from '../../../lib/billing';
import { formatDate, formatMoney } from '../../../lib/portal';

const customerSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name'),
  email: emailSchema,
  phone: z.string().trim().regex(/^[+\d\s-]{0,20}$/, 'Enter a valid phone number'),
  company: z.string().trim(),
  city: z.string().trim(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^$|^[0-9A-Z]{15}$/, 'GSTIN has 15 letters and digits'),
});

type CustomerValues = z.infer<typeof customerSchema>;

export function CustomersPage() {
  const list = customers.use();
  const subs = subscriptionStore.use();
  const invoices = invoiceStore.use();
  const payments = paymentStore.use();
  const canEdit = useCanEdit('customers');
  const [query, setQuery] = useState('');
  // undefined = closed, null = adding, customer = editing.
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined);

  const q = query.trim().toLowerCase();
  const rows = list.filter(
    (c) => !q || [c.name, c.company, c.email, c.city].some((v) => v.toLowerCase().includes(q)),
  );

  const outstanding = (customerId: string) =>
    invoices
      .filter((i) => i.customerId === customerId && i.status === 'Confirmed')
      .reduce((sum, i) => sum + invoiceTotal(i) - amountPaid(i.id, payments), 0);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone you bill, with their active subscriptions and what they owe."
        actions={
          canEdit && (
            <Button onClick={() => setEditing(null)}>
              <Plus size={14} /> Add customer
            </Button>
          )
        }
      />
      {!canEdit && <ReadOnlyNote />}

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name, company, email" />
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Customer</th>
                <th className={th}>City</th>
                <th className={`${th} text-right`}>Active subscriptions</th>
                <th className={`${th} text-right`}>Outstanding</th>
                <th className={th}>Since</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={6}>No customers match.</EmptyRow>}
              {rows.map((c) => {
                const active = subs.filter((s) => s.customerId === c.id && s.status === 'Active').length;
                const owed = outstanding(c.id);
                return (
                  <tr key={c.id} className={rowClass}>
                    <td className={td}>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.company ? `${c.company} · ` : ''}
                        {c.email}
                      </p>
                    </td>
                    <td className={`${td} text-muted-foreground`}>{c.city || '—'}</td>
                    <td className={`${td} text-right`}>
                      <Link
                        to={`/admin/subscriptions?customer=${c.id}`}
                        className="font-mono underline-offset-2 hover:underline"
                      >
                        {active}
                      </Link>
                    </td>
                    <td className={`${td} text-right font-mono`}>
                      {owed > 0 ? formatMoney(owed) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className={`${td} text-muted-foreground`}>{formatDate(c.createdAt)}</td>
                    <td className={td}>
                      {canEdit && (
                        <div className="flex justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                            <PencilSimple size={14} /> Edit
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editing !== undefined && <CustomerDialog customer={editing} onClose={() => setEditing(undefined)} />}
    </>
  );
}

function CustomerDialog({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ?? { name: '', email: '', phone: '', company: '', city: '', gstin: '' },
  });

  const onSubmit = (values: CustomerValues) => {
    customers.upsert({
      ...values,
      id: customer?.id ?? newId(),
      createdAt: customer?.createdAt ?? today(),
    });
    onClose();
  };

  return (
    <Dialog
      title={customer ? 'Edit customer' : 'Add customer'}
      description={customer ? customer.email : 'Billing details for invoices.'}
      icon={AddressBook}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="name" label="Full name" error={errors.name?.message}>
            <Input id="name" autoFocus {...fieldAria('name', errors.name?.message)} {...register('name')} />
          </FormField>
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input id="email" type="email" {...fieldAria('email', errors.email?.message)} {...register('email')} />
          </FormField>
          <FormField id="phone" label="Phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" {...fieldAria('phone', errors.phone?.message)} {...register('phone')} />
          </FormField>
          <FormField id="company" label="Company">
            <Input id="company" {...register('company')} />
          </FormField>
          <FormField id="city" label="City">
            <Input id="city" {...register('city')} />
          </FormField>
          <FormField id="gstin" label="GSTIN" error={errors.gstin?.message}>
            <Input
              id="gstin"
              placeholder="Optional"
              className="font-mono uppercase"
              {...fieldAria('gstin', errors.gstin?.message)}
              {...register('gstin')}
            />
          </FormField>
        </div>
        <DialogActions onCancel={onClose} submitLabel={customer ? 'Save changes' : 'Add customer'} />
      </form>
    </Dialog>
  );
}
