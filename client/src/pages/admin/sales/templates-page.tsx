import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { Card, EmptyRow, PageHeader } from '../../../components/portal/portal-ui';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  linesTotals,
  newId,
  plans as planStore,
  templates,
  type Line,
  type QuotationTemplate,
} from '../../../lib/billing';
import { formatMoney } from '../../../lib/portal';
import { LinesEditor, linesError } from './lines-editor';

const templateSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name'),
    planId: z.string().min(1, 'Pick a plan'),
    validityDays: z.number({ error: 'Enter days' }).int('Whole days only').min(1, 'At least 1 day'),
    lines: z.array(z.custom<Line>()),
  })
  .superRefine((values, ctx) => {
    const message = linesError(values.lines);
    if (message) ctx.addIssue({ code: 'custom', message, path: ['lines'] });
  });

type TemplateValues = z.infer<typeof templateSchema>;

export function TemplatesPage() {
  const list = templates.use();
  const plans = planStore.use();
  const canEdit = useCanEdit('templates');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<QuotationTemplate | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<QuotationTemplate | null>(null);

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? '—';
  const q = query.trim().toLowerCase();
  const rows = list.filter((t) => !q || `${t.name} ${planName(t.planId)}`.toLowerCase().includes(q));

  return (
    <>
      <PageHeader
        title="Quotation templates"
        description="Ready-made lines to start a quotation quickly."
        actions={
          canEdit && (
            <Button onClick={() => setEditing(null)}>
              <Plus size={14} /> New template
            </Button>
          )
        }
      />
      {!canEdit && <ReadOnlyNote />}

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search templates" />
      </Toolbar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className={theadClass}>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Plan</th>
                <th className={`${th} text-right`}>Lines</th>
                <th className={`${th} text-right`}>Valid for</th>
                <th className={`${th} text-right`}>Total</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={6}>No templates yet.</EmptyRow>}
              {rows.map((t) => (
                <tr key={t.id} className={rowClass}>
                  <td className={`${td} font-medium`}>{t.name}</td>
                  <td className={`${td} text-muted-foreground`}>{planName(t.planId)}</td>
                  <td className={`${td} text-right font-mono`}>{t.lines.length}</td>
                  <td className={`${td} text-right`}>
                    <span className="font-mono">{t.validityDays}</span> days
                  </td>
                  <td className={`${td} text-right font-mono`}>{formatMoney(linesTotals(t.lines).total)}</td>
                  <td className={td}>
                    {canEdit && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
                          <PencilSimple size={14} /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}>
                          <Trash size={14} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing !== undefined && <TemplateDialog template={editing} onClose={() => setEditing(undefined)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          body="Existing subscriptions keep their lines. This can't be undone."
          confirmLabel="Delete template"
          destructive
          onConfirm={() => templates.remove(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function TemplateDialog({ template, onClose }: { template: QuotationTemplate | null; onClose: () => void }) {
  const plans = planStore.use();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: template ?? { name: '', planId: plans[0]?.id ?? '', validityDays: 15, lines: [] },
  });

  const onSubmit = (values: TemplateValues) => {
    templates.upsert({ ...values, id: template?.id ?? newId() });
    onClose();
  };

  return (
    <Dialog
      title={template ? 'Edit template' : 'New template'}
      description="Lines are copied into new quotations."
      icon={FileText}
      wide
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="name" label="Name" error={errors.name?.message}>
            <Input id="name" autoFocus {...fieldAria('name', errors.name?.message)} {...register('name')} />
          </FormField>
          <FormField id="planId" label="Plan" error={errors.planId?.message}>
            <Select id="planId" {...fieldAria('planId', errors.planId?.message)} {...register('planId')}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="validityDays" label="Valid for (days)" error={errors.validityDays?.message}>
            <Input
              id="validityDays"
              type="number"
              min={1}
              className="font-mono"
              {...fieldAria('validityDays', errors.validityDays?.message)}
              {...register('validityDays', { valueAsNumber: true })}
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
        <DialogActions onCancel={onClose} submitLabel={template ? 'Save changes' : 'Create template'} />
      </form>
    </Dialog>
  );
}
