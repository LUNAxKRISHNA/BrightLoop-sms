import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from '@phosphor-icons/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { AuthHeader, AuthLayout, AuthSuccess, FormAlert } from '../components/auth/auth-layout';
import { fieldAria, FormField } from '../components/auth/form-field';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../lib/auth-schemas';
import { forgotPassword } from '../lib/auth';

export function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setFormError(null);
    try {
      await forgotPassword(values);
      setSentTo(values.email);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <AuthLayout
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>
      }
    >
      {sentTo ? (
        // Same message whether or not the account exists (PRD 4.1).
        <AuthSuccess
          title="Check your email"
          action={
            <Button variant="secondary" onClick={() => setSentTo(null)}>
              Use a different email
            </Button>
          }
        >
          If an account exists for {sentTo}, we've sent a link to reset your password. The link
          expires in 30 minutes.
        </AuthSuccess>
      ) : (
        <>
          <AuthHeader
            title="Reset password"
            description="Enter your email and we'll send you a link to reset your password."
          />
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

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending link…' : 'Send reset link'}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
