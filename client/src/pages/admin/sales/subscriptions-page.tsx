import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowsClockwise, Plus, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  Dialog,
  DialogActions,
  ReadOnlyNote,
  rowClass,
  SearchInput,
  Select,
  td,
  th,
  theadClass,
  Toolbar,
  useCanEdit,
} from '../../../components/admin/admin-ui';
import { fieldAria, FormField } from '../../../components/auth/form-field';
import { Card, EmptyRow, FilterPills, PageHeader } from '../../../components/portal/portal-ui';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { StatusBadge } from '../../../components/ui/status-badge';
import {
  customers as customerStore,
  isPlanSellable,
  linesTotals,
  plans as planStore,
  subscriptions,
  templates as templateStore,
  newId,
  today,
  toMonthly,
  type Line,
  type Subscription,
  type SubscriptionStatus,
} from '../../../lib/billing';
import { formatDate, formatMoney } from '../../../lib/portal';
import { LinesEditor, linesError } from './lines-editor';

type Filter = 'all' | SubscriptionStatus;

const statuses: SubscriptionStatus[] = ['Draft', 'Quotation', 'Confirmed', 'Active', 'Paused', 'Closed'];

function monthlyAmount(s: Subscription) {
  const plan = planStore.find(s.planId);
  const total = linesTotals(s.lines).total;
  return plan ? toMonthly(total, plan.period) : total;
}

export function SubscriptionsPage() {
  const list = subscriptions.use();
  const customers = customerStore.use();
  const plans = planStore.use();
  const canEdit = useCanEdit('subscriptions');
  const [params, setParams] = useSearchParams();
  const customerFilter = params.get('customer');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? id;
  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

  const q = query.trim().toLowerCase();
  const scoped = list
    .filter((s) => !customerFilter || s.customerId === customerFilter)
    .filter(
      (s) =>
        !q ||
        `${s.number} ${customerName(s.customerId)} ${planName(s.planId)}`.toLowerCase().includes(q),
    );
  const rows = scoped
    .filter((s) => filter === 'all' || s.status === filter)
    .sort((a, b) => b.number.localeCompare(a.number));

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Quotations, active plans and everything in between."
        actions={
          canEdit && (
            <Button onClick={() => setAdding(true)}>
              <Plus size={14} /> New subscription
            </Button>
          )
        }
      />
      {!canEdit && <ReadOnlyNote />}

      <Toolbar aside={<SearchInput value={query} onChange={setQuery} placeholder="Search number, customer, plan" />}>
        <FilterPills
          options={[
            { value: 'all' as Filter, label: 'All', count: scoped.length },
            ...statuses.map((status) => ({
              value: status as Filter,
              label: status,
              count: scoped.filter((s) => s.status === status).length,
            })),
          ]}
          value={filter}
          onChange={setFilter}
        />
        {customerFilter && (
          <button
            type="button"
            onClick={() => setParams({})}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
          >
            {customerName(customerFilter)} <X size={12} />
          </button>
        )}
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Number</th>
                <th className={th}>Customer</th>
                <th className={th}>Plan</th>
                <th className={th}>Status</th>
                <th className={th}>Start</th>
                <th className={th}>Next billing</th>
                <th className={`${th} text-right`}>Monthly</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={7}>No subscriptions here.</EmptyRow>}
              {rows.map((s) => (
                <tr key={s.id} className={rowClass}>
                  <td className={td}>
                    <Link to={`/admin/subscriptions/${s.id}`} className="font-mono font-medium hover:underline">
                      {s.number}
                    </Link>
                  </td>
                  <td className={td}>{customerName(s.customerId)}</td>
                  <td className={`${td} text-muted-foreground`}>{planName(s.planId)}</td>
                  <td className={td}>
                    <StatusBadge status={s.status} />
                  </td>
                  <td className={`${td} text-muted-foreground`}>{formatDate(s.startDate)}</td>
                  <td className={`${td} text-muted-foreground`}>{s.nextBilling ? formatDate(s.nextBilling) : '—'}</td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(monthlyAmount(s))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {adding && <NewSubscriptionDialog defaultCustomer={customerFilter} onClose={() => setAdding(false)} />}
    </>
  );
}

const subscriptionSchema = z
  .object({
    customerId: z.string().min(1, 'Pick a customer'),
    planId: z.string().min(1, 'Pick a plan'),
    startDate: z.string().min(1, 'Pick a start date'),
    expiryDate: z.string(),
    paymentTerms: z.number({ error: 'Enter days' }).int('Whole days only').min(0, 'Cannot be negative'),
    lines: z.array(z.custom<Line>()),
  })
  .superRefine((values, ctx) => {
    if (values.expiryDate && values.expiryDate <= values.startDate) {
      ctx.addIssue({ code: 'custom', message: 'Expiry must be after the start date', path: ['expiryDate'] });
    }
    const message = linesError(values.lines);
    if (message) {
      ctx.addIssue({ code: 'custom', message, path: ['lines'] });
      return;
    }
    const plan = planStore.find(values.planId);
    const quantity = values.lines.reduce((sum, l) => sum + l.quantity, 0);
    if (plan && quantity < plan.minQuantity) {
      ctx.addIssue({
        code: 'custom',
        message: `${plan.name} needs a total quantity of at least ${plan.minQuantity}`,
        path: ['lines'],
      });
    }
  });

type SubscriptionValues = z.infer<typeof subscriptionSchema>;

function nextNumber(list: Subscription[]) {
  const max = list.reduce((m, s) => Math.max(m, Number(s.number.split('-').pop()) || 0), 0);
  return max + 1;
}

function NewSubscriptionDialog({ defaultCustomer, onClose }: { defaultCustomer: string | null; onClose: () => void }) {
  const navigate = useNavigate();
  const customers = customerStore.use();
  const sellable = planStore.use().filter((p) => isPlanSellable(p));
  const templates = templateStore.use();
  const [templateId, setTemplateId] = useState('');
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SubscriptionValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      customerId: defaultCustomer ?? '',
      planId: sellable[0]?.id ?? '',
      startDate: today(),
      expiryDate: '',
      paymentTerms: 15,
      lines: [],
    },
  });
  const planId = useWatch({ control, name: 'planId' });
  const plan = sellable.find((p) => p.id === planId);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setValue('lines', template.lines.map((l) => ({ ...l })), { shouldValidate: false });
    if (sellable.some((p) => p.id === template.planId)) setValue('planId', template.planId);
  };

  const onSubmit = (values: SubscriptionValues) => {
    const n = nextNumber(subscriptions.get());
    const id = newId();
    subscriptions.upsert({
      id,
      number: `SUB-${String(n).padStart(5, '0')}`,
      customerId: values.customerId,
      planId: values.planId,
      status: 'Draft',
      startDate: values.startDate,
      expiryDate: values.expiryDate || null,
      nextBilling: null,
      paymentTerms: values.paymentTerms,
      quotationExpiresAt: null,
      lines: values.lines,
      createdAt: today(),
    });
    onClose();
    navigate(`/admin/subscriptions/${id}`);
  };

  return (
    <Dialog
      title="New subscription"
      description="Starts as a draft. Send it as a quotation when it's ready."
      icon={ArrowsClockwise}
      wide
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="customerId" label="Customer" error={errors.customerId?.message}>
            <Select id="customerId" {...fieldAria('customerId', errors.customerId?.message)} {...register('customerId')}>
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` · ${c.company}` : ''}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="planId" label="Plan" error={errors.planId?.message}>
            <Select id="planId" {...fieldAria('planId', errors.planId?.message)} {...register('planId')}>
              {sellable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatMoney(p.price)} / {p.period.toLowerCase()}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="templateId" label="Start from template">
            <Select id="templateId" value={templateId} onChange={(event) => applyTemplate(event.target.value)}>
              <option value="">None</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="paymentTerms" label="Payment terms (days)" error={errors.paymentTerms?.message}>
            <Input
              id="paymentTerms"
              type="number"
              min={0}
              className="font-mono"
              {...fieldAria('paymentTerms', errors.paymentTerms?.message)}
              {...register('paymentTerms', { valueAsNumber: true })}
            />
          </FormField>
          <FormField id="startDate" label="Start date" error={errors.startDate?.message}>
            <Input id="startDate" type="date" {...fieldAria('startDate', errors.startDate?.message)} {...register('startDate')} />
          </FormField>
          <FormField id="expiryDate" label="Expiry date (optional)" error={errors.expiryDate?.message}>
            <Input
              id="expiryDate"
              type="date"
              {...fieldAria('expiryDate', errors.expiryDate?.message)}
              {...register('expiryDate')}
            />
          </FormField>
        </div>
        <Controller
          control={control}
          name="lines"
          render={({ field }) => (
            <LinesEditor value={field.value} onChange={field.onChange} error={errors.lines?.message} />
          )}
        />
        {plan && plan.minQuantity > 1 && (
          <p className="text-xs text-muted-foreground">
            {plan.name} needs a total quantity of at least {plan.minQuantity}.
          </p>
        )}
        <DialogActions onCancel={onClose} submitLabel="Create draft" />
      </form>
    </Dialog>
  );
}
