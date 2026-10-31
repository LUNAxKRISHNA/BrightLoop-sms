import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { AuthHeader, AuthLayout, AuthSuccess, FormAlert } from '../components/auth/auth-layout';
import { fieldAria, FormField } from '../components/auth/form-field';
import { PasswordInput } from '../components/auth/password-input';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { loginSchema, type LoginValues } from '../lib/auth-schemas';
import { mockLogin } from '../lib/mock-auth';

export function LoginPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const user = await mockLogin(values);
      setSignedInAs(user.email);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <AuthLayout
      footer={
        <>
          New to Brightloop?{' '}
          <Link to="/signup" className="font-medium text-foreground hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {signedInAs ? (
        <AuthSuccess
          title="You're signed in"
          action={
            <Button variant="secondary" onClick={() => setSignedInAs(null)}>
              Back to sign in
            </Button>
          }
        >
          Signed in as {signedInAs}. This is a mock login, no session was created.
        </AuthSuccess>
      ) : (
        <>
          <AuthHeader title="Sign in" description="Welcome back. Enter your details to continue." />
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
      )}
    </AuthLayout>
  );
}
