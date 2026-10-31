import { zodResolver } from '@hookform/resolvers/zod';
import {
  Crown,
  PencilSimple,
  Plus,
  SortAscending,
  SortDescending,
  UserGear,
  X,
} from '@phosphor-icons/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { FormAlert } from '../../components/auth/auth-layout';
import { fieldAria, FormField } from '../../components/auth/form-field';
import { Card, EmptyRow, FilterPills, PageHeader } from '../../components/portal/portal-ui';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { emailSchema } from '../../lib/auth-schemas';
import {
  grantableSections,
  saveStaff,
  sections,
  useSessionUser,
  useStaff,
  type Role,
  type SectionKey,
  type StaffMember,
} from '../../lib/admin';
import { formatDate } from '../../lib/portal';
import { cn } from '../../lib/utils';

const staffSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name'),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .regex(/^[+\d\s-]{0,20}$/, 'Enter a valid phone number'),
    jobTitle: z.string().trim(),
    role: z.enum(['admin', 'staff']),
    sections: z.array(z.string()),
    active: z.boolean(),
  })
  // Admins get every section, so only staff need at least one.
  .refine((values) => values.role === 'admin' || values.sections.length > 0, {
    message: 'Give access to at least one section',
    path: ['sections'],
  });

type StaffValues = z.infer<typeof staffSchema>;

type Filter = 'all' | Role;

const sectionLabel = (key: string) => sections.find((s) => s.key === key)?.label ?? key;

export function StaffPage() {
  const team = useStaff();
  const me = useSessionUser();
  const [filter, setFilter] = useState<Filter>('all');
  // undefined = closed, null = adding, member = editing.
  const [editing, setEditing] = useState<StaffMember | null | undefined>(undefined);
  const [promoting, setPromoting] = useState<StaffMember | null>(null);
  const [adminsFirst, setAdminsFirst] = useState(true);

  const admins = team.filter((m) => m.role === 'admin');
  const staff = team.filter((m) => m.role === 'staff');
  // Grouped by role (order toggled from the Role header), each group in the order they were added.
  const rows = (adminsFirst ? [...admins, ...staff] : [...staff, ...admins]).filter(
    (m) => filter === 'all' || m.role === filter,
  );

  return (
    <>
      <PageHeader
        title="Team"
        description="Admins have full access. Staff only see the sections you give them."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus size={14} /> Add member
          </Button>
        }
      />

      <div className="mb-3">
        <FilterPills
          options={[
            { value: 'all', label: 'All', count: team.length },
            { value: 'admin', label: 'Admins', count: admins.length },
            { value: 'staff', label: 'Staff', count: staff.length },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th
                  className="px-5 py-2.5 font-medium"
                  aria-sort={adminsFirst ? 'ascending' : 'descending'}
                >
                  <button
                    type="button"
                    onClick={() => setAdminsFirst((value) => !value)}
                    title={adminsFirst ? 'Admins first. Click to show staff first.' : 'Staff first. Click to show admins first.'}
                    className="-mx-1 inline-flex items-center gap-1 rounded px-1 transition-colors duration-150 hover:text-foreground"
                  >
                    Role
                    {adminsFirst ? <SortAscending size={14} /> : <SortDescending size={14} />}
                  </button>
                </th>
                <th className="px-5 py-2.5 font-medium">Access</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium">Added</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={6}>No one here yet.</EmptyRow>}
              {rows.map((member) => (
                <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted">
                  <td className="px-5 py-2.5">
                    <p className="font-medium">
                      {member.name}
                      {member.email === me?.email && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                      {member.jobTitle && ` · ${member.jobTitle}`}
                    </p>
                  </td>
                  <td className="px-5 py-2.5">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-5 py-2.5">
                    {member.role === 'admin' ? (
                      <span className="text-muted-foreground">Everything</span>
                    ) : (
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {member.sections.map((key) => (
                          <span
                            key={key}
                            className="rounded-full bg-status-grey-bg px-2 py-0.5 text-xs text-status-grey-fg"
                          >
                            {sectionLabel(key)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-2.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                        member.active
                          ? 'bg-status-green-bg text-status-green-fg'
                          : 'bg-status-grey-bg text-status-grey-fg',
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          member.active ? 'bg-status-green' : 'bg-status-grey',
                        )}
                      />
                      {member.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground">{formatDate(member.createdAt)}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex justify-end gap-1">
                      {member.role === 'staff' && member.active && (
                        <Button variant="ghost" size="sm" onClick={() => setPromoting(member)}>
                          <Crown size={14} /> Make admin
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setEditing(member)}>
                        <PencilSimple size={14} /> Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing !== undefined && (
        <StaffDialog member={editing} onClose={() => setEditing(undefined)} />
      )}
      {promoting && <PromoteDialog member={promoting} onClose={() => setPromoting(null)} />}
    </>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return role === 'admin' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
      <Crown size={12} weight="fill" /> Admin
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-status-grey-bg px-2 py-0.5 text-xs font-medium text-status-grey-fg">
      Staff
    </span>
  );
}

function Dialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 sm:items-center">
      <div aria-hidden className="fixed inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-dialog-title"
        className="relative w-full max-w-lg rounded-dialog border border-border bg-background shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-muted">
              <UserGear size={18} />
            </span>
            <div>
              <h2 id="team-dialog-title" className="font-semibold">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1.5 transition-colors duration-150 hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PromoteDialog({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  return (
    <Dialog title={`Make ${member.name} an admin?`} description={member.email} onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-muted-foreground">
          Admins can see and change everything, including products, taxes, discounts and the team.
          You can switch them back to staff later.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              saveStaff({ ...member, role: 'admin' })
                .then(onClose)
                .catch((error: Error) => alert(error.message));
            }}
          >
            <Crown size={14} /> Make admin
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

const roleOptions: { value: Role; label: string; hint: string }[] = [
  { value: 'staff', label: 'Staff', hint: 'Only the sections you pick' },
  { value: 'admin', label: 'Admin', hint: 'Full access, manages the team' },
];

function StaffDialog({ member, onClose }: { member: StaffMember | null; onClose: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: member ?? {
      name: '',
      email: '',
      phone: '',
      jobTitle: '',
      role: 'staff',
      sections: ['dashboard'],
      active: true,
    },
  });
  const role = useWatch({ control, name: 'role' });

  const onSubmit = async (values: StaffValues) => {
    setFormError(null);
    try {
      await saveStaff({ ...values, sections: values.sections as SectionKey[], id: member?.id });
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <Dialog
      title={member ? 'Edit team member' : 'Add team member'}
      description={member ? member.email : 'They get an email to set their password.'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-5">
        {formError && <FormAlert message={formError} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="name" label="Full name" error={errors.name?.message}>
            <Input id="name" autoFocus {...fieldAria('name', errors.name?.message)} {...register('name')} />
          </FormField>
          <FormField id="email" label="Work email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              placeholder="name@brightloop.in"
              {...fieldAria('email', errors.email?.message)}
              {...register('email')}
            />
          </FormField>
          <FormField id="phone" label="Phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" {...fieldAria('phone', errors.phone?.message)} {...register('phone')} />
          </FormField>
          <FormField id="jobTitle" label="Job title">
            <Input id="jobTitle" placeholder="e.g. Billing executive" {...register('jobTitle')} />
          </FormField>
        </div>

        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <fieldset>
              <legend className="text-sm font-medium">Role</legend>
              <div role="radiogroup" className="mt-2 grid grid-cols-2 gap-1.5">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === option.value}
                    onClick={() => field.onChange(option.value)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left transition-colors duration-150',
                      field.value === option.value
                        ? 'border-foreground bg-muted'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      {option.value === 'admin' && <Crown size={14} />}
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{option.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        />

        {role === 'staff' && (
          <Controller
            control={control}
            name="sections"
            render={({ field }) => (
              <fieldset aria-describedby={errors.sections ? 'sections-error' : undefined}>
                <div className="flex items-center justify-between">
                  <legend className="text-sm font-medium">Access</legend>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      field.onChange(
                        field.value.length === grantableSections.length
                          ? []
                          : grantableSections.map((s) => s.key),
                      )
                    }
                  >
                    {field.value.length === grantableSections.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {grantableSections.map((section) => {
                    const checked = field.value.includes(section.key);
                    return (
                      <label
                        key={section.key}
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
                              checked
                                ? field.value.filter((key) => key !== section.key)
                                : [...field.value, section.key],
                            )
                          }
                        />
                        {section.label}
                      </label>
                    );
                  })}
                </div>
                {errors.sections && (
                  <p id="sections-error" className="mt-1.5 text-xs text-status-red-fg">
                    {errors.sections.message}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Team management stays admin only.
                </p>
              </fieldset>
            )}
          />
        )}

        <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <span>
            <span className="block font-medium">Active</span>
            <span className="text-xs text-muted-foreground">Inactive members can't sign in.</span>
          </span>
          <input type="checkbox" className="size-4 accent-primary" {...register('active')} />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {member ? 'Save changes' : 'Add member'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
