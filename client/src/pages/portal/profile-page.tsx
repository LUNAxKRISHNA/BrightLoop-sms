import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle } from '@phosphor-icons/react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FormAlert } from '../../components/auth/auth-layout';
import { fieldAria, FormField } from '../../components/auth/form-field';
import { PasswordInput } from '../../components/auth/password-input';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { passwordRules } from '../../lib/auth-schemas';
import { customer, formatDate, mockSaveProfile } from '../../lib/mock-portal';
import {
  billingSchema,
  changePasswordSchema,
  detailsSchema,
  type BillingValues,
  type ChangePasswordValues,
  type DetailsValues,
} from '../../lib/profile-schemas';
import { cn } from '../../lib/utils';

/** Two-column settings section: title and description left, card right. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-border py-8 first:border-0 first:pt-0 md:grid-cols-[260px_1fr] md:gap-10">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-card border border-border bg-background shadow-sm">{children}</div>
    </section>
  );
}

/** Card footer with the save button and a short-lived "Saved" note. */
function SaveBar({
  saving,
  saved,
  dirty,
  label = 'Save changes',
}: {
  saving: boolean;
  saved: boolean;
  dirty: boolean;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border bg-surface px-5 py-3">
      {saved && (
        <span className="inline-flex items-center gap-1.5 text-xs text-status-green-fg">
          <CheckCircle size={14} /> Saved
        </span>
      )}
      <Button type="submit" size="sm" disabled={saving || !dirty}>
        {saving ? 'Saving…' : label}
      </Button>
    </div>
  );
}

function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);
  return [saved, setSaved] as const;
}

function DetailsForm() {
  const [saved, setSaved] = useSavedFlash();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
    },
  });

  const onSubmit = async (values: DetailsValues) => {
    await mockSaveProfile(values);
    reset(values);
    setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <FormField id="name" label="Full name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            {...fieldAria('name', errors.name?.message)}
            {...register('name')}
          />
        </FormField>
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...fieldAria('email', errors.email?.message)}
            {...register('email')}
          />
        </FormField>
        <FormField id="phone" label="Phone" error={errors.phone?.message}>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            {...fieldAria('phone', errors.phone?.message)}
            {...register('phone')}
          />
        </FormField>
        <FormField id="company" label="Company (optional)" error={errors.company?.message}>
          <Input id="company" autoComplete="organization" {...register('company')} />
        </FormField>
      </div>
      <SaveBar saving={isSubmitting} saved={saved} dirty={isDirty} />
    </form>
  );
}

function BillingForm() {
  const [saved, setSaved] = useSavedFlash();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BillingValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: customer.billing,
  });

  const onSubmit = async (values: BillingValues) => {
    await mockSaveProfile(values);
    reset(values);
    setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField id="address" label="Address" error={errors.address?.message}>
            <Input
              id="address"
              autoComplete="street-address"
              {...fieldAria('address', errors.address?.message)}
              {...register('address')}
            />
          </FormField>
        </div>
        <FormField id="city" label="City" error={errors.city?.message}>
          <Input
            id="city"
            autoComplete="address-level2"
            {...fieldAria('city', errors.city?.message)}
            {...register('city')}
          />
        </FormField>
        <FormField id="state" label="State" error={errors.state?.message}>
          <Input
            id="state"
            autoComplete="address-level1"
            {...fieldAria('state', errors.state?.message)}
            {...register('state')}
          />
        </FormField>
        <FormField id="postalCode" label="PIN code" error={errors.postalCode?.message}>
          <Input
            id="postalCode"
            inputMode="numeric"
            autoComplete="postal-code"
            className="font-mono"
            {...fieldAria('postalCode', errors.postalCode?.message)}
            {...register('postalCode')}
          />
        </FormField>
        <FormField id="gstin" label="GSTIN (optional)" error={errors.gstin?.message}>
          <Input
            id="gstin"
            placeholder="22AAAAA0000A1Z5"
            className="font-mono uppercase"
            {...fieldAria('gstin', errors.gstin?.message)}
            {...register('gstin')}
          />
        </FormField>
      </div>
      <SaveBar saving={isSubmitting} saved={saved} dirty={isDirty} />
    </form>
  );
}

function PasswordForm() {
  const [saved, setSaved] = useSavedFlash();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });
  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';

  const onSubmit = async (values: ChangePasswordValues) => {
    setFormError(null);
    try {
      await mockSaveProfile(values);
      reset();
      setSaved(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-4 p-5">
        {formError && (
          <div className="-mt-6">
            <FormAlert message={formError} />
          </div>
        )}
        <div className="sm:max-w-sm">
          <FormField
            id="currentPassword"
            label="Current password"
            error={errors.currentPassword?.message}
          >
            <PasswordInput
              id="currentPassword"
              autoComplete="current-password"
              {...fieldAria('currentPassword', errors.currentPassword?.message)}
              {...register('currentPassword')}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="newPassword" label="New password" error={errors.newPassword?.message}>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              {...fieldAria('newPassword', errors.newPassword?.message)}
              {...register('newPassword')}
            />
          </FormField>
          <FormField
            id="confirmPassword"
            label="Confirm new password"
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              {...fieldAria('confirmPassword', errors.confirmPassword?.message)}
              {...register('confirmPassword')}
            />
          </FormField>
        </div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
          {passwordRules.map((rule) => (
            <li
              key={rule.label}
              className={cn(
                'text-xs transition-colors duration-150',
                rule.test(newPassword) ? 'text-status-green-fg' : 'text-muted-foreground',
              )}
            >
              {rule.label}
            </li>
          ))}
        </ul>
      </div>
      <SaveBar saving={isSubmitting} saved={saved} dirty={isDirty} label="Update password" />
    </form>
  );
}

function AccountInfo() {
  const rows = [
    { label: 'Customer ID', value: <span className="font-mono">{customer.id}</span> },
    { label: 'Customer since', value: formatDate(customer.since) },
    { label: 'Account type', value: 'Customer' },
  ];
  return (
    <dl className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between px-5 py-3">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProfilePage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your details, billing address and password.
        </p>
      </div>

      <Section title="Personal details" description="How we contact you about your subscriptions.">
        <DetailsForm />
      </Section>
      <Section
        title="Billing address"
        description="Printed on your invoices. Changes apply to new invoices only."
      >
        <BillingForm />
      </Section>
      <Section title="Password" description="Use a strong password you don't use anywhere else.">
        <PasswordForm />
      </Section>
      <Section title="Account" description="Details about your Brightloop account.">
        <AccountInfo />
      </Section>
    </>
  );
}
