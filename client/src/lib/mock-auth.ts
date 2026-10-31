import type { ForgotPasswordValues, LoginValues, SignupValues } from './auth-schemas';

// Mock only: replace with the /api/auth endpoints once auth is built.

const delay = () => new Promise((resolve) => setTimeout(resolve, 800));

export async function mockLogin(values: LoginValues) {
  await delay();
  if (values.password === 'wrong') {
    throw new Error('Incorrect email or password.');
  }
  return { email: values.email };
}

export async function mockSignup(values: SignupValues) {
  await delay();
  if (values.email === 'taken@example.com') {
    throw new Error('An account with this email already exists.');
  }
  return { email: values.email };
}

export async function mockForgotPassword(_values: ForgotPasswordValues) {
  await delay();
}
