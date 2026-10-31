import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Circle } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { AuthHeader, AuthLayout, AuthSuccess, FormAlert } from '../components/auth/auth-layout';
import { fieldAria, FormField } from '../components/auth/form-field';
import { PasswordInput } from '../components/auth/password-input';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { passwordRules, signupSchema, type SignupValues } from '../lib/auth-schemas';
import { mockSignup } from '../lib/mock-auth';
import { cn } from '../lib/utils';

export function SignupPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [createdFor, setCreatedFor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const password = useWatch({ control, name: 'password' }) ?? '';

  const onSubmit = async (values: SignupValues) => {
    setFormError(null);
    try {
      const user = await mockSignup(values);
      setCreatedFor(user.email);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <AuthLayout
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {createdFor ? (
        <AuthSuccess
          title="Account created"
          action={
            <Link to="/login">
              <Button>Go to sign in</Button>
            </Link>
          }
        >
          {createdFor} is ready to use. This is a mock signup, no account was saved.
        </AuthSuccess>
      ) : (
        <>
          <AuthHeader
            title="Create an account"
            description="See your subscriptions and invoices in one place."
          />
          {formError && <FormAlert message={formError} />}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
            <FormField id="name" label="Full name" error={errors.name?.message}>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Asha Patel"
                {...fieldAria('name', errors.name?.message)}
                {...register('name')}
              />
            </FormField>

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

            <FormField id="password" label="Password" error={errors.password?.message}>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                {...fieldAria('password', errors.password?.message)}
                {...register('password')}
              />
              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                {passwordRules.map((rule) => {
                  const met = rule.test(password);
                  return (
                    <li
                      key={rule.label}
                      className={cn(
                        'flex items-center gap-1.5 text-xs transition-colors duration-150',
                        met ? 'text-status-green-fg' : 'text-muted-foreground',
                      )}
                    >
                      {met ? <Check size={12} /> : <Circle size={12} />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </FormField>

            <FormField
              id="confirmPassword"
              label="Confirm password"
              error={errors.confirmPassword?.message}
            >
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                {...fieldAria('confirmPassword', errors.confirmPassword?.message)}
                {...register('confirmPassword')}
              />
            </FormField>

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating accountâ€¦' : 'Create account'}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
