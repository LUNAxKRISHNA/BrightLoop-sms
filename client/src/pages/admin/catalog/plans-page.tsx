import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarBlank, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  ConfirmDialog,
  Dialog,
  DialogActions,
  ReadOnlyNote,
  rowClass,
  SearchInput,
  Select,
  Tag,
  td,
  th,
  theadClass,
  Toggle,
  Toolbar,
  useCanEdit,
} from '../../../components/admin/admin-ui';
import { fieldAria, FormField } from '../../../components/auth/form-field';
import { Card, EmptyRow, FilterPills, PageHeader } from '../../../components/portal/portal-ui';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  isPlanSellable,
  newId,
  plans,
  subscriptions,
  toMonthly,
  today,
  type BillingPeriod,
  type Plan,
} from '../../../lib/billing';
import { formatDate, formatMoney } from '../../../lib/portal';

const periods: BillingPeriod[] = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const planSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name'),
    price: z.number({ error: 'Enter a price' }).min(0, 'Price can’t be negative'),
    period: z.enum(['Daily', 'Weekly', 'Monthly', 'Yearly']),
    minQuantity: z.number({ error: 'Enter a quantity' }).int('Use a whole number').min(1, 'At least 1'),
    availableFrom: z.string().min(1, 'Pick a start date'),
    availableUntil: z.string(),
    autoClose: z.boolean(),
    closable: z.boolean(),
    pausable: z.boolean(),
    renewable: z.boolean(),
  })
  .refine((v) => !v.availableUntil || v.availableUntil > v.availableFrom, {
    message: 'Must be after the start date',
    path: ['availableUntil'],
  });

type PlanValues = z.infer<typeof planSchema>;
type Filter = 'all' | 'sellable' | 'unsellable';

const liveStatuses = ['Active', 'Paused', 'Confirmed'];

export function PlansPage() {
  const list = plans.use();
  const subs = subscriptions.use();
  const canEdit = useCanEdit('plans');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Plan | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Plan | null>(null);

  const activeCount = (id: string) =>
    subs.filter((s) => s.planId === id && liveStatuses.includes(s.status)).length;
  const usedCount = (id: string) => subs.filter((s) => s.planId === id).length;
  const q = query.trim().toLowerCase();
  const sellable = list.filter((p) => isPlanSellable(p));
  const rows = list.filter(
    (p) =>
      (filter === 'all' || (filter === 'sellable') === isPlanSellable(p)) &&
      (!q || p.name.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader
        title="Plans"
        description="Billing periods and rules that subscriptions follow."
        actions={
          canEdit && (
            <Button onClick={() => setEditing(null)}>
              <Plus size={14} /> Add plan
            </Button>
          )
        }
      />
      {!canEdit && <ReadOnlyNote />}

      <Toolbar aside={<SearchInput value={query} onChange={setQuery} placeholder="Search plans" />}>
        <FilterPills
          options={[
            { value: 'all', label: 'All', count: list.length },
            { value: 'sellable', label: 'Sellable', count: sellable.length },
            { value: 'unsellable', label: 'Not sellable', count: list.length - sellable.length },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Name</th>
                <th className={`${th} text-right`}>Price</th>
                <th className={`${th} text-right`}>Per month</th>
                <th className={`${th} text-right`}>Min qty</th>
                <th className={th}>Available</th>
                <th className={th}>Rules</th>
                <th className={`${th} text-right`}>Active subs</th>
                {canEdit && <th className={th} />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={canEdit ? 8 : 7}>No plans match.</EmptyRow>}
              {rows.map((plan) => (
                <tr key={plan.id} className={rowClass}>
                  <td className={td}>
                    <p className="font-medium">{plan.name}</p>
                    <div className="mt-0.5 flex gap-1">
                      <Tag>{plan.period}</Tag>
                      {!isPlanSellable(plan) && <Tag dark>Not sellable</Tag>}
                    </div>
                  </td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(plan.price)}</td>
                  <td className={`${td} text-right font-mono text-muted-foreground`}>
                    {formatMoney(toMonthly(plan.price, plan.period))}
                  </td>
                  <td className={`${td} text-right font-mono`}>{plan.minQuantity}</td>
                  <td className={`${td} text-muted-foreground`}>
                    {formatDate(plan.availableFrom)} – {plan.availableUntil ? formatDate(plan.availableUntil) : 'No end'}
                  </td>
                  <td className={td}>
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {plan.autoClose && <Tag>Auto-close</Tag>}
                      {plan.closable && <Tag>Closable</Tag>}
                      {plan.pausable && <Tag>Pausable</Tag>}
                      {plan.renewable && <Tag>Renewable</Tag>}
                    </div>
                  </td>
                  <td className={`${td} text-right font-mono`}>{activeCount(plan.id)}</td>
                  {canEdit && (
                    <td className={td}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(plan)}>
                          <PencilSimple size={14} /> Edit
                        </Button>
                        {usedCount(plan.id) === 0 && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleting(plan)}>
                            <Trash size={14} /> Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing !== undefined && <PlanDialog plan={editing} onClose={() => setEditing(undefined)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          body="No subscription uses this plan. This can't be undone."
          confirmLabel="Delete plan"
          destructive
          onConfirm={() => plans.remove(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function PlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
    defaultValues: plan
      ? { ...plan, availableUntil: plan.availableUntil ?? '' }
      : {
          name: '',
          price: 0,
          period: 'Monthly',
          minQuantity: 1,
          availableFrom: today(),
          availableUntil: '',
          autoClose: false,
          closable: true,
          pausable: true,
          renewable: true,
        },
  });

  const onSubmit = (values: PlanValues) => {
    plans.upsert({
      ...values,
      availableUntil: values.availableUntil || null,
      id: plan?.id ?? newId(),
    });
    onClose();
  };

  return (
    <Dialog title={plan ? 'Edit plan' : 'Add plan'} description={plan?.name} icon={CalendarBlank} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
        <FormField id="name" label="Name" error={errors.name?.message}>
          <Input id="name" autoFocus {...fieldAria('name', errors.name?.message)} {...register('name')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="price" label="Price (₹)" error={errors.price?.message}>
            <Input id="price" type="number" step="0.01" {...fieldAria('price', errors.price?.message)} {...register('price', { valueAsNumber: true })} />
          </FormField>
          <FormField id="period" label="Billing period">
            <Select id="period" {...register('period')}>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="minQuantity" label="Min quantity" error={errors.minQuantity?.message}>
            <Input
              id="minQuantity"
              type="number"
              min={1}
              {...fieldAria('minQuantity', errors.minQuantity?.message)}
              {...register('minQuantity', { valueAsNumber: true })}
            />
          </FormField>
          <FormField id="availableFrom" label="Available from" error={errors.availableFrom?.message}>
            <Input id="availableFrom" type="date" {...fieldAria('availableFrom', errors.availableFrom?.message)} {...register('availableFrom')} />
          </FormField>
          <FormField id="availableUntil" label="Available until" error={errors.availableUntil?.message}>
            <Input id="availableUntil" type="date" {...fieldAria('availableUntil', errors.availableUntil?.message)} {...register('availableUntil')} />
          </FormField>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Auto-close" hint="Closes at the end of the period." {...register('autoClose')} />
          <Toggle label="Closable" hint="Can be closed early." {...register('closable')} />
          <Toggle label="Pausable" hint="Can be paused." {...register('pausable')} />
          <Toggle label="Renewable" hint="Can be renewed." {...register('renewable')} />
        </div>
        <DialogActions onCancel={onClose} submitLabel={plan ? 'Save changes' : 'Add plan'} />
      </form>
    </Dialog>
  );
}
