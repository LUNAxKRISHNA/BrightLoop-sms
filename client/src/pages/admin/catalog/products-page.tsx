import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, Package, PencilSimple, Plus, Sliders, Trash, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import {
  ActivePill,
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
  attributes,
  newId,
  products,
  subscriptions,
  taxes,
  variantPrice,
  type Attribute,
  type Product,
} from '../../../lib/billing';
import { formatMoney } from '../../../lib/portal';
import { cn } from '../../../lib/utils';

type Tab = 'products' | 'attributes';
type Filter = 'all' | 'active' | 'archived';

export function ProductsPage() {
  const productList = products.use();
  const attributeList = attributes.use();
  const canEdit = useCanEdit('products');
  const [tab, setTab] = useState<Tab>('products');

  return (
    <>
      <PageHeader
        title="Products"
        description="What you sell, with variants priced from attribute values."
      />
      {!canEdit && <ReadOnlyNote />}
      <div className="mb-4">
        <FilterPills
          options={[
            { value: 'products', label: 'Products', count: productList.length },
            { value: 'attributes', label: 'Attributes', count: attributeList.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === 'products' ? <ProductsTable canEdit={canEdit} /> : <AttributesTable canEdit={canEdit} />}
    </>
  );
}

// --- Products ---

function ProductsTable({ canEdit }: { canEdit: boolean }) {
  const list = products.use();
  const taxList = taxes.use();
  const subs = subscriptions.use();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [removing, setRemoving] = useState<{ product: Product; inUse: boolean } | null>(null);

  const inUse = (id: string) => subs.some((s) => s.lines.some((l) => l.productId === id));
  const taxName = (id: string) => taxList.find((t) => t.id === id)?.name ?? id;
  const q = query.trim().toLowerCase();
  const rows = list.filter(
    (p) =>
      (filter === 'all' || (filter === 'active') === p.active) &&
      (!q || p.name.toLowerCase().includes(q) || p.notes.toLowerCase().includes(q)),
  );

  return (
    <>
      <Toolbar
        aside={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <SearchInput value={query} onChange={setQuery} placeholder="Search products" />
            {canEdit && (
              <Button onClick={() => setEditing(null)}>
                <Plus size={14} /> Add product
              </Button>
            )}
          </div>
        }
      >
        <FilterPills
          options={[
            { value: 'all', label: 'All', count: list.length },
            { value: 'active', label: 'Active', count: list.filter((p) => p.active).length },
            { value: 'archived', label: 'Archived', count: list.filter((p) => !p.active).length },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Type</th>
                <th className={`${th} text-right`}>Sales price</th>
                <th className={`${th} text-right`}>Cost price</th>
                <th className={th}>Taxes</th>
                <th className={`${th} text-right`}>Variants</th>
                <th className={th}>Status</th>
                {canEdit && <th className={th} />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={canEdit ? 8 : 7}>No products match.</EmptyRow>}
              {rows.map((product) => (
                <tr key={product.id} className={rowClass}>
                  <td className={td}>
                    <p className="font-medium">{product.name}</p>
                    {product.notes && <p className="text-xs text-muted-foreground">{product.notes}</p>}
                  </td>
                  <td className={td}>
                    <Tag>{product.type}</Tag>
                  </td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(product.salesPrice)}</td>
                  <td className={`${td} text-right font-mono text-muted-foreground`}>
                    {formatMoney(product.costPrice)}
                  </td>
                  <td className={`${td} text-muted-foreground`}>
                    {product.taxIds.length ? product.taxIds.map(taxName).join(', ') : 'None'}
                  </td>
                  <td className={`${td} text-right font-mono`}>{product.variants.length}</td>
                  <td className={td}>
                    <ActivePill active={product.active} labels={['Active', 'Archived']} />
                  </td>
                  {canEdit && (
                    <td className={td}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(product)}>
                          <PencilSimple size={14} /> Edit
                        </Button>
                        {inUse(product.id) ? (
                          product.active && (
                            <Button variant="ghost" size="sm" onClick={() => setRemoving({ product, inUse: true })}>
                              <Archive size={14} /> Archive
                            </Button>
                          )
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setRemoving({ product, inUse: false })}>
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

      {editing !== undefined && <ProductDialog product={editing} onClose={() => setEditing(undefined)} />}
      {removing &&
        (removing.inUse ? (
          <ConfirmDialog
            title={`Archive ${removing.product.name}?`}
            body="Subscriptions use this product, so it can't be deleted. Archived products stay on existing subscriptions but can't be added to new ones."
            confirmLabel="Archive"
            onConfirm={() => products.upsert({ ...removing.product, active: false })}
            onClose={() => setRemoving(null)}
          />
        ) : (
          <ConfirmDialog
            title={`Delete ${removing.product.name}?`}
            body="No subscription uses this product. This can't be undone."
            confirmLabel="Delete product"
            destructive
            onConfirm={() => products.remove(removing.product.id)}
            onClose={() => setRemoving(null)}
          />
        ))}
    </>
  );
}

const productSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name'),
  type: z.enum(['Software', 'Add-on', 'Service']),
  salesPrice: z.number({ error: 'Enter a price' }).min(0, 'Can’t be negative'),
  costPrice: z.number({ error: 'Enter a price' }).min(0, 'Can’t be negative'),
  notes: z.string().trim(),
  taxIds: z.array(z.string()),
  active: z.boolean(),
  variants: z.array(
    z.object({
      id: z.string(),
      name: z.string().trim().min(1, 'Name the variant'),
      valueIds: z.array(z.string()).min(1, 'Pick at least one value'),
    }),
  ),
});

type ProductValues = z.infer<typeof productSchema>;

function ProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const taxList = taxes.use();
  const attributeList = attributes.use();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ?? {
      name: '',
      type: 'Service',
      salesPrice: 0,
      costPrice: 0,
      notes: '',
      taxIds: taxList.filter((t) => t.active).slice(0, 1).map((t) => t.id),
      active: true,
      variants: [],
    },
  });
  const variants = useFieldArray({ control, name: 'variants' });
  const salesPrice = useWatch({ control, name: 'salesPrice' });
  const watchedVariants = useWatch({ control, name: 'variants' });

  // Show inactive taxes only if this product already has them.
  const taxOptions = taxList.filter((t) => t.active || product?.taxIds.includes(t.id));

  const onSubmit = (values: ProductValues) => {
    products.upsert({ ...values, id: product?.id ?? newId() });
    onClose();
  };

  const newVariantId = newId;

  return (
    <Dialog
      title={product ? 'Edit product' : 'Add product'}
      description={product?.name}
      icon={Package}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-3">
            <FormField id="name" label="Name" error={errors.name?.message}>
              <Input id="name" autoFocus {...fieldAria('name', errors.name?.message)} {...register('name')} />
            </FormField>
          </div>
          <FormField id="type" label="Type">
            <Select id="type" {...register('type')}>
              <option value="Software">Software</option>
              <option value="Add-on">Add-on</option>
              <option value="Service">Service</option>
            </Select>
          </FormField>
          <FormField id="salesPrice" label="Sales price (₹)" error={errors.salesPrice?.message}>
            <Input id="salesPrice" type="number" step="0.01" {...fieldAria('salesPrice', errors.salesPrice?.message)} {...register('salesPrice', { valueAsNumber: true })} />
          </FormField>
          <FormField id="costPrice" label="Cost price (₹)" error={errors.costPrice?.message}>
            <Input id="costPrice" type="number" step="0.01" {...fieldAria('costPrice', errors.costPrice?.message)} {...register('costPrice', { valueAsNumber: true })} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField id="notes" label="Notes">
              <Input id="notes" placeholder="e.g. Per user, per month" {...register('notes')} />
            </FormField>
          </div>
        </div>

        <Controller
          control={control}
          name="taxIds"
          render={({ field }) => (
            <fieldset>
              <legend className="text-sm font-medium">Taxes</legend>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {taxOptions.map((tax) => {
                  const checked = field.value.includes(tax.id);
                  return (
                    <label
                      key={tax.id}
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
                          field.onChange(checked ? field.value.filter((id) => id !== tax.id) : [...field.value, tax.id])
                        }
                      />
                      {tax.name}
                      {!tax.active && <span className="text-xs text-muted-foreground">(inactive)</span>}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
        />

        <fieldset>
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium">Variants</legend>
            <Button
              variant="ghost"
              size="sm"
              disabled={attributeList.length === 0}
              onClick={() => variants.append({ id: newVariantId(), name: '', valueIds: [] })}
            >
              <Plus size={14} /> Add variant
            </Button>
          </div>
          {variants.fields.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              No variants. Add one to sell this product with attribute values that change the price.
            </p>
          )}
          <div className="mt-2 flex flex-col gap-2">
            {variants.fields.map((item, index) => {
              const current = watchedVariants?.[index];
              const price = variantPrice(
                { ...(product as Product), salesPrice: Number.isNaN(salesPrice) ? 0 : salesPrice },
                current ? { id: current.id, name: current.name, valueIds: current.valueIds } : undefined,
              );
              const error = errors.variants?.[index];
              return (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-36 flex-1">
                      <FormField id={`variant-${index}-name`} label="Variant name" error={error?.name?.message}>
                        <Input
                          id={`variant-${index}-name`}
                          {...fieldAria(`variant-${index}-name`, error?.name?.message)}
                          {...register(`variants.${index}.name`)}
                        />
                      </FormField>
                    </div>
                    <Controller
                      control={control}
                      name={`variants.${index}.valueIds`}
                      render={({ field }) => (
                        <>
                          {attributeList.map((attr) => {
                            const selected = attr.values.find((v) => field.value.includes(v.id));
                            return (
                              <div key={attr.id} className="w-36">
                                <FormField id={`variant-${index}-${attr.id}`} label={attr.name}>
                                  <Select
                                    id={`variant-${index}-${attr.id}`}
                                    value={selected?.id ?? ''}
                                    onChange={(event) => {
                                      const others = field.value.filter((id) => !attr.values.some((v) => v.id === id));
                                      field.onChange(event.target.value ? [...others, event.target.value] : others);
                                    }}
                                  >
                                    <option value="">Any</option>
                                    {attr.values.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.value}
                                        {v.extraPrice ? ` (+${formatMoney(v.extraPrice)})` : ''}
                                      </option>
                                    ))}
                                  </Select>
                                </FormField>
                              </div>
                            );
                          })}
                        </>
                      )}
                    />
                    <div className="ml-auto flex items-center gap-2 pb-1.5">
                      <span className="font-mono">{formatMoney(price)}</span>
                      <button
                        type="button"
                        aria-label="Remove variant"
                        onClick={() => variants.remove(index)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  {error?.valueIds && <p className="mt-1.5 text-xs text-status-red-fg">{error.valueIds.message}</p>}
                </div>
              );
            })}
          </div>
        </fieldset>

        <Toggle label="Active" hint="Archived products can't be added to new subscriptions." {...register('active')} />
        <DialogActions onCancel={onClose} submitLabel={product ? 'Save changes' : 'Add product'} />
      </form>
    </Dialog>
  );
}

// --- Attributes ---

function AttributesTable({ canEdit }: { canEdit: boolean }) {
  const list = attributes.use();
  const productList = products.use();
  const [editing, setEditing] = useState<Attribute | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Attribute | null>(null);

  const usedBy = (attr: Attribute) =>
    productList.filter((p) => p.variants.some((v) => v.valueIds.some((id) => attr.values.some((av) => av.id === id))))
      .length;

  return (
    <>
      {canEdit && (
        <Toolbar
          aside={
            <Button onClick={() => setEditing(null)}>
              <Plus size={14} /> Add attribute
            </Button>
          }
        />
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Attribute</th>
                <th className={th}>Values and extra price</th>
                <th className={`${th} text-right`}>Products</th>
                {canEdit && <th className={th} />}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <EmptyRow colSpan={canEdit ? 4 : 3}>No attributes yet.</EmptyRow>}
              {list.map((attr) => {
                const used = usedBy(attr);
                return (
                  <tr key={attr.id} className={rowClass}>
                    <td className={`${td} font-medium`}>{attr.name}</td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1">
                        {attr.values.map((v) => (
                          <Tag key={v.id}>
                            {v.value}
                            <span className="font-mono opacity-70">+{formatMoney(v.extraPrice)}</span>
                          </Tag>
                        ))}
                      </div>
                    </td>
                    <td className={`${td} text-right font-mono`}>{used}</td>
                    {canEdit && (
                      <td className={td}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(attr)}>
                            <PencilSimple size={14} /> Edit
                          </Button>
                          {used === 0 && (
                            <Button variant="ghost" size="sm" onClick={() => setDeleting(attr)}>
                              <Trash size={14} /> Delete
                            </Button>
                          )}
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
      <p className="mt-2 text-xs text-muted-foreground">
        A variant's price is the product's sales price plus the extra price of each value it uses.
      </p>

      {editing !== undefined && <AttributeDialog attribute={editing} onClose={() => setEditing(undefined)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          body="No variant uses this attribute. This can't be undone."
          confirmLabel="Delete attribute"
          destructive
          onConfirm={() => attributes.remove(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

const attributeSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name'),
  values: z
    .array(
      z.object({
        id: z.string(),
        value: z.string().trim().min(1, 'Enter a value'),
        extraPrice: z.number({ error: 'Enter a price' }).min(0, 'Can’t be negative'),
      }),
    )
    .min(1, 'Add at least one value'),
});

type AttributeValues = z.infer<typeof attributeSchema>;

function AttributeDialog({ attribute, onClose }: { attribute: Attribute | null; onClose: () => void }) {
  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<AttributeValues>({
    resolver: zodResolver(attributeSchema),
    defaultValues: attribute ?? { name: '', values: [{ id: '', value: '', extraPrice: 0 }] },
  });
  const values = useFieldArray({ control, name: 'values' });

  const onSubmit = (data: AttributeValues) => {
        const withIds = data.values.map((v) => {
      if (v.id) return v;
      const id = newId();
      return { ...v, id };
    });
    attributes.upsert({ ...data, values: withIds, id: attribute?.id ?? newId() });
    onClose();
  };

  // Values used by a variant can't be removed (it would change existing prices).
  const usedValueIds = new Set(products.get().flatMap((p) => p.variants.flatMap((v) => v.valueIds)));

  return (
    <Dialog
      title={attribute ? 'Edit attribute' : 'Add attribute'}
      description={attribute?.name ?? 'e.g. Brand with values Odoo, Zoho'}
      icon={Sliders}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
        <FormField id="attr-name" label="Name" error={errors.name?.message}>
          <Input id="attr-name" autoFocus {...fieldAria('attr-name', errors.name?.message)} {...register('name')} />
        </FormField>
        <fieldset>
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium">Values</legend>
            <Button variant="ghost" size="sm" onClick={() => values.append({ id: '', value: '', extraPrice: 0 })}>
              <Plus size={14} /> Add value
            </Button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {values.fields.map((item, index) => {
              const error = errors.values?.[index];
              const locked = usedValueIds.has(getValues(`values.${index}.id`));
              return (
                <div key={item.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      aria-label="Value"
                      placeholder="Value"
                      aria-invalid={error?.value ? true : undefined}
                      {...register(`values.${index}.value`)}
                    />
                    {error?.value && <p className="mt-1 text-xs text-status-red-fg">{error.value.message}</p>}
                  </div>
                  <div className="w-32">
                    <Input
                      aria-label="Extra price"
                      type="number"
                      step="0.01"
                      className="font-mono"
                      aria-invalid={error?.extraPrice ? true : undefined}
                      {...register(`values.${index}.extraPrice`, { valueAsNumber: true })}
                    />
                    {error?.extraPrice && <p className="mt-1 text-xs text-status-red-fg">{error.extraPrice.message}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove value"
                    disabled={locked}
                    title={locked ? 'Used by a variant' : undefined}
                    onClick={() => values.remove(index)}
                    className="mt-1 rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:opacity-40"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          {errors.values?.root?.message && (
            <p className="mt-1.5 text-xs text-status-red-fg">{errors.values.root.message}</p>
          )}
          {errors.values?.message && <p className="mt-1.5 text-xs text-status-red-fg">{errors.values.message}</p>}
        </fieldset>
        <DialogActions onCancel={onClose} submitLabel={attribute ? 'Save changes' : 'Add attribute'} />
      </form>
    </Dialog>
  );
}
