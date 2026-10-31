import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { AuthHeader, AuthLayout, FormAlert } from '../components/auth/auth-layout';
import { fieldAria, FormField } from '../components/auth/form-field';
import { PasswordInput } from '../components/auth/password-input';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { loginSchema, type LoginValues } from '../lib/auth-schemas';
import { login, signOut } from '../lib/auth';
import { cn } from '../lib/utils';

type Role = 'customer' | 'staff';

const roles: { value: Role; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'staff', label: 'Staff' },
];

function RoleToggle({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Sign in as"
      className="relative mx-auto grid w-48 grid-cols-2 rounded-full border border-border bg-surface p-0.5"
    >
      {/* Sliding black pill behind the selected option. */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-foreground shadow-sm transition-transform duration-200 ease-out',
          value === 'staff' && 'translate-x-full',
        )}
      />
      {roles.map((role) => (
        <button
          key={role.value}
          type="button"
          role="radio"
          aria-checked={value === role.value}
          onClick={() => onChange(role.value)}
          className={cn(
            'relative z-10 rounded-full py-1 text-xs font-medium transition-colors duration-200',
            value === role.value
              ? 'text-background'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {role.label}
        </button>
      ))}
    </div>
  );
}

export function LoginPage() {
  const [role, setRole] = useState<Role>('customer');
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const user = await login(values);
      const isCustomer = user.role === 'CUSTOMER';
      if (isCustomer !== (role === 'customer')) {
        signOut();
        throw new Error(isCustomer ? 'This is a customer account. Switch to Customer to sign in.' : 'This is a staff account. Switch to Staff to sign in.');
      }
      // Admin and staff share the admin area; staff only see the sections they were given.
      navigate(isCustomer ? '/portal' : '/admin');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <AuthLayout
      footer={
        role === 'customer' ? (
          <>
            New to Brightloop?{' '}
            <Link to="/signup" className="font-medium text-foreground hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          'Staff accounts are created by an admin.'
        )
      }
    >
        <>
          <RoleToggle
            value={role}
            onChange={(next) => {
              setRole(next);
              setFormError(null);
            }}
          />
          <div className="mt-4">
            <AuthHeader
              title="Sign in"
              description={
                role === 'customer'
                  ? 'Welcome back. Enter your details to continue.'
                  : 'Sign in with your Brightloop staff account.'
              }
            />
          </div>
          {formError && <FormAlert message={formError} />}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
            <FormField id="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                {...fieldAria('email', errors.email?.message)}
                {...register('email')}
              />
            </FormField>

            <FormField
              id="password"
              label="Password"
              error={errors.password?.message}
              labelAction={
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
                >
                  Forgot password?
                </Link>
              }
            >
              <PasswordInput
                id="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...fieldAria('password', errors.password?.message)}
                {...register('password')}
              />
            </FormField>

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </>
    </AuthLayout>
  );
}
