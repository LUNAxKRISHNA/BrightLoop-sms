import { zodResolver } from '@hookform/resolvers/zod';
import { PencilSimple, Percent, Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  ActivePill,
  ConfirmDialog,
  Dialog,
  DialogActions,
  ReadOnlyNote,
  rowClass,
  SearchInput,
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
import { newId, products, taxes, type Tax } from '../../../lib/billing';

const taxSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name'),
  rate: z
    .number({ error: 'Enter a rate' })
    .min(0, 'Rate can’t be negative')
    .max(100, 'Rate can’t be over 100%'),
  active: z.boolean(),
});

type TaxValues = z.infer<typeof taxSchema>;
type Filter = 'all' | 'active' | 'inactive';

export function TaxesPage() {
  const list = taxes.use();
  const productList = products.use();
  const canEdit = useCanEdit('taxes');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Tax | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Tax | null>(null);

  const usage = (id: string) => productList.filter((p) => p.taxIds.includes(id)).length;
  const q = query.trim().toLowerCase();
  const rows = list.filter(
    (t) =>
      (filter === 'all' || (filter === 'active') === t.active) &&
      (!q || t.name.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader
        title="Taxes"
        description="Tax rates you can attach to products. Rates apply on top of the discounted price."
        actions={
          canEdit && (
            <Button onClick={() => setEditing(null)}>
              <Plus size={14} /> Add tax
            </Button>
          )
        }
      />
      {!canEdit && <ReadOnlyNote />}

      <Toolbar aside={<SearchInput value={query} onChange={setQuery} placeholder="Search taxes" />}>
        <FilterPills
          options={[
            { value: 'all', label: 'All', count: list.length },
            { value: 'active', label: 'Active', count: list.filter((t) => t.active).length },
            { value: 'inactive', label: 'Inactive', count: list.filter((t) => !t.active).length },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Name</th>
                <th className={`${th} text-right`}>Rate</th>
                <th className={`${th} text-right`}>Products</th>
                <th className={th}>Status</th>
                {canEdit && <th className={th} />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={canEdit ? 5 : 4}>No taxes match.</EmptyRow>}
              {rows.map((tax) => {
                const used = usage(tax.id);
                return (
                  <tr key={tax.id} className={rowClass}>
                    <td className={`${td} font-medium`}>{tax.name}</td>
                    <td className={`${td} text-right font-mono`}>{tax.rate}%</td>
                    <td className={`${td} text-right font-mono`}>{used}</td>
                    <td className={td}>
                      <ActivePill active={tax.active} />
                    </td>
                    {canEdit && (
                      <td className={td}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(tax)}>
                            <PencilSimple size={14} /> Edit
                          </Button>
                          {used === 0 && (
                            <Button variant="ghost" size="sm" onClick={() => setDeleting(tax)}>
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
        Taxes used by products can be made inactive but not deleted.
      </p>

      {editing !== undefined && <TaxDialog tax={editing} onClose={() => setEditing(undefined)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          body="This tax isn't used by any product. This can't be undone."
          confirmLabel="Delete tax"
          destructive
          onConfirm={() => taxes.remove(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function TaxDialog({ tax, onClose }: { tax: Tax | null; onClose: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaxValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: tax ?? { name: '', rate: 18, active: true },
  });

  const onSubmit = (values: TaxValues) => {
    taxes.upsert({ ...values, id: tax?.id ?? newId() });
    onClose();
  };

  return (
    <Dialog title={tax ? 'Edit tax' : 'Add tax'} description={tax?.name} icon={Percent} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="name" label="Name" error={errors.name?.message}>
            <Input id="name" autoFocus placeholder="e.g. GST 18%" {...fieldAria('name', errors.name?.message)} {...register('name')} />
          </FormField>
          <FormField id="rate" label="Rate (%)" error={errors.rate?.message}>
            <Input
              id="rate"
              type="number"
              step="0.01"
              {...fieldAria('rate', errors.rate?.message)}
              {...register('rate', { valueAsNumber: true })}
            />
          </FormField>
        </div>
        <Toggle label="Active" hint="Inactive taxes aren't added to new lines." {...register('active')} />
        <DialogActions onCancel={onClose} submitLabel={tax ? 'Save changes' : 'Add tax'} />
      </form>
    </Dialog>
  );
}
