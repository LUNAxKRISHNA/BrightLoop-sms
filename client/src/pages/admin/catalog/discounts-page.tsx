import { zodResolver } from '@hookform/resolvers/zod';
import { PencilSimple, Plus, Tag as TagIcon, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import {
  ConfirmDialog,
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
import {
  discounts,
  discountState,
  newId,
  products,
  today,
  type Discount,
  type DiscountState,
} from '../../../lib/billing';
import { formatDate, formatMoney } from '../../../lib/portal';
import { cn } from '../../../lib/utils';

const optionalNumber = (v: unknown) => (v === '' || v === null || Number.isNaN(v) ? null : Number(v));

const discountSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name'),
    type: z.enum(['Fixed', 'Percentage']),
    value: z.number({ error: 'Enter a value' }).positive('Must be above zero'),
    minPurchase: z.number({ error: 'Enter an amount' }).min(0, 'Can’t be negative'),
    minQuantity: z.number({ error: 'Enter a quantity' }).int('Use a whole number').min(0, 'Can’t be negative'),
    startDate: z.string().min(1, 'Pick a start date'),
    endDate: z.string(),
    usageLimit: z.number().int('Use a whole number').min(1, 'At least 1').nullable(),
    scope: z.enum(['Products', 'Subscription']),
    productIds: z.array(z.string()),
  })
  .refine((v) => v.type !== 'Percentage' || v.value <= 100, {
    message: 'A percentage can’t be over 100',
    path: ['value'],
  })
  .refine((v) => !v.endDate || v.endDate > v.startDate, {
    message: 'Must be after the start date',
    path: ['endDate'],
  })
  .refine((v) => v.scope === 'Subscription' || v.productIds.length > 0, {
    message: 'Pick at least one product',
    path: ['productIds'],
  });

type DiscountValues = z.infer<typeof discountSchema>;
type Filter = 'all' | DiscountState;

const stateStyles: Record<DiscountState, [string, string]> = {
  Active: ['bg-status-green-bg text-status-green-fg', 'bg-status-green'],
  Scheduled: ['bg-status-blue-bg text-status-blue-fg', 'bg-status-blue'],
  Expired: ['bg-status-grey-bg text-status-grey-fg', 'bg-status-grey'],
  'Used up': ['bg-status-grey-bg text-status-grey-fg', 'bg-status-grey'],
};

function StatePill({ state }: { state: DiscountState }) {
  const [pill, dot] = stateStyles[state];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', pill)}>
      <span className={cn('size-1.5 rounded-full', dot)} />
      {state}
    </span>
  );
}

const formatValue = (d: Pick<Discount, 'type' | 'value'>) =>
  d.type === 'Percentage' ? `${d.value}%` : formatMoney(d.value);

export function DiscountsPage() {
  const list = discounts.use();
  const productList = products.use();
  const canEdit = useCanEdit('discounts');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Discount | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Discount | null>(null);

  const productName = (id: string) => productList.find((p) => p.id === id)?.name ?? id;
  const count = (s: DiscountState) => list.filter((d) => discountState(d) === s).length;
  const q = query.trim().toLowerCase();
  const rows = list.filter(
    (d) => (filter === 'all' || discountState(d) === filter) && (!q || d.name.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader
        title="Discounts"
        description="Offers applied to subscription lines or the whole subscription."
        actions={
          canEdit && (
            <Button onClick={() => setEditing(null)}>
              <Plus size={14} /> Add discount
            </Button>
          )
        }
      />
      {!canEdit && <ReadOnlyNote />}

      <Toolbar aside={<SearchInput value={query} onChange={setQuery} placeholder="Search discounts" />}>
        <FilterPills
          options={[
            { value: 'all', label: 'All', count: list.length },
            { value: 'Active', label: 'Active', count: count('Active') },
            { value: 'Scheduled', label: 'Scheduled', count: count('Scheduled') },
            { value: 'Expired', label: 'Expired', count: count('Expired') },
            { value: 'Used up', label: 'Used up', count: count('Used up') },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Name</th>
                <th className={`${th} text-right`}>Value</th>
                <th className={th}>Conditions</th>
                <th className={th}>Valid</th>
                <th className={th}>Usage</th>
                <th className={th}>Applies to</th>
                <th className={th}>State</th>
                {canEdit && <th className={th} />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={canEdit ? 8 : 7}>No discounts match.</EmptyRow>}
              {rows.map((d) => {
                const conditions = [
                  d.minPurchase > 0 && `Min ${formatMoney(d.minPurchase)}`,
                  d.minQuantity > 0 && `Min qty ${d.minQuantity}`,
                ].filter(Boolean);
                return (
                  <tr key={d.id} className={rowClass}>
                    <td className={`${td} font-medium`}>{d.name}</td>
                    <td className={`${td} text-right font-mono`}>
                      {formatValue(d)}
                      <span className="block font-sans text-xs text-muted-foreground">{d.type}</span>
                    </td>
                    <td className={`${td} text-muted-foreground`}>
                      {conditions.length ? conditions.join(' · ') : 'None'}
                    </td>
                    <td className={`${td} text-muted-foreground`}>
                      {formatDate(d.startDate)} – {d.endDate ? formatDate(d.endDate) : 'No end'}
                    </td>
                    <td className={td}>
                      <span className="font-mono">
                        {d.timesUsed}
                        {d.usageLimit !== null && ` / ${d.usageLimit}`}
                      </span>
                      {d.usageLimit !== null && (
                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.min(100, (d.timesUsed / d.usageLimit) * 100)}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className={td}>
                      {d.scope === 'Subscription' ? (
                        <span className="text-muted-foreground">Whole subscription</span>
                      ) : (
                        <span className="block max-w-xs">{d.productIds.map(productName).join(', ')}</span>
                      )}
                    </td>
                    <td className={td}>
                      <StatePill state={discountState(d)} />
                    </td>
                    {canEdit && (
                      <td className={td}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(d)}>
                            <PencilSimple size={14} /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleting(d)}>
                            <Trash size={14} /> Delete
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {editing !== undefined && <DiscountDialog discount={editing} onClose={() => setEditing(undefined)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          body="Subscriptions that already used it keep their discount. This can't be undone."
          confirmLabel="Delete discount"
          destructive
          onConfirm={() => discounts.remove(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

const scopeOptions = [
  { value: 'Products', label: 'Specific products', hint: 'Only on matching lines' },
  { value: 'Subscription', label: 'Whole subscription', hint: 'On the subscription total' },
] as const;

function DiscountDialog({ discount, onClose }: { discount: Discount | null; onClose: () => void }) {
  const productList = products.use();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DiscountValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: discount
      ? { ...discount, endDate: discount.endDate ?? '' }
      : {
          name: '',
          type: 'Percentage',
          value: 10,
          minPurchase: 0,
          minQuantity: 0,
          startDate: today(),
          endDate: '',
          usageLimit: null,
          scope: 'Subscription',
          productIds: [],
        },
  });
  const scope = useWatch({ control, name: 'scope' });
  const type = useWatch({ control, name: 'type' });

  const onSubmit = (values: DiscountValues) => {
    discounts.upsert({
      ...values,
      endDate: values.endDate || null,
      productIds: values.scope === 'Products' ? values.productIds : [],
      timesUsed: discount?.timesUsed ?? 0,
      id: discount?.id ?? newId(),
    });
    onClose();
  };

  return (
    <Dialog
      title={discount ? 'Edit discount' : 'Add discount'}
      description={discount?.name}
      icon={TagIcon}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <FormField id="name" label="Name" error={errors.name?.message}>
              <Input id="name" autoFocus {...fieldAria('name', errors.name?.message)} {...register('name')} />
            </FormField>
          </div>
          <FormField id="type" label="Type">
            <Select id="type" {...register('type')}>
              <option value="Percentage">Percentage</option>
              <option value="Fixed">Fixed amount</option>
            </Select>
          </FormField>
          <FormField id="value" label={type === 'Percentage' ? 'Value (%)' : 'Value (₹)'} error={errors.value?.message}>
            <Input id="value" type="number" step="0.01" {...fieldAria('value', errors.value?.message)} {...register('value', { valueAsNumber: true })} />
          </FormField>
          <FormField id="usageLimit" label="Usage limit" error={errors.usageLimit?.message}>
            <Input
              id="usageLimit"
              type="number"
              placeholder="Unlimited"
              {...fieldAria('usageLimit', errors.usageLimit?.message)}
              {...register('usageLimit', { setValueAs: optionalNumber })}
            />
          </FormField>
          <FormField id="minPurchase" label="Min purchase (₹)" error={errors.minPurchase?.message}>
            <Input id="minPurchase" type="number" step="0.01" {...fieldAria('minPurchase', errors.minPurchase?.message)} {...register('minPurchase', { valueAsNumber: true })} />
          </FormField>
          <FormField id="minQuantity" label="Min quantity" error={errors.minQuantity?.message}>
            <Input id="minQuantity" type="number" {...fieldAria('minQuantity', errors.minQuantity?.message)} {...register('minQuantity', { valueAsNumber: true })} />
          </FormField>
          <div />
          <FormField id="startDate" label="Start date" error={errors.startDate?.message}>
            <Input id="startDate" type="date" {...fieldAria('startDate', errors.startDate?.message)} {...register('startDate')} />
          </FormField>
          <FormField id="endDate" label="End date" error={errors.endDate?.message}>
            <Input id="endDate" type="date" {...fieldAria('endDate', errors.endDate?.message)} {...register('endDate')} />
          </FormField>
        </div>

        <Controller
          control={control}
          name="scope"
          render={({ field }) => (
            <fieldset>
              <legend className="text-sm font-medium">Applies to</legend>
              <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-1.5">
                {scopeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === option.value}
                    onClick={() => field.onChange(option.value)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left transition-colors duration-150',
                      field.value === option.value ? 'border-foreground bg-muted' : 'border-border hover:bg-muted',
                    )}
                  >
                    <span className="block font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        />

        {scope === 'Products' && (
          <Controller
            control={control}
            name="productIds"
            render={({ field }) => (
              <fieldset aria-describedby={errors.productIds ? 'productIds-error' : undefined}>
                <legend className="text-sm font-medium">Products</legend>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {productList.map((product) => {
                    const checked = field.value.includes(product.id);
                    return (
                      <label
                        key={product.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors duration-150',
                          checked ? 'border-foreground bg-muted' : 'border-border hover:bg-muted',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={checked}
                          onChange={() =>
                            field.onChange(
                              checked ? field.value.filter((id) => id !== product.id) : [...field.value, product.id],
                            )
                          }
                        />
                        {product.name}
                      </label>
                    );
                  })}
                </div>
                {errors.productIds && (
                  <p id="productIds-error" className="mt-1.5 text-xs text-status-red-fg">
                    {errors.productIds.message}
                  </p>
                )}
              </fieldset>
            )}
          />
        )}

        <DialogActions onCancel={onClose} submitLabel={discount ? 'Save changes' : 'Add discount'} />
      </form>
    </Dialog>
  );
}
