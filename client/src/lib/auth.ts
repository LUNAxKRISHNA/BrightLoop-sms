import { apiFetch, setToken } from './api';
import type { ForgotPasswordValues, LoginValues, SignupValues } from './auth-schemas';

export type AuthRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

/** Signs in and keeps the token for later API calls. */
export async function login(values: LoginValues) {
  const { token, user } = await apiFetch<{ token: string; user: { id: string; email: string; role: AuthRole } }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify(values) },
  );
  setToken(token);
  return user;
}

export function signup(values: SignupValues) {
  return apiFetch<{ email: string }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(values) });
}

export async function forgotPassword(values: ForgotPasswordValues) {
  await apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(values) });
}

export async function changePassword(values: { currentPassword: string; newPassword: string }) {
  await apiFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify(values) });
}

export function signOut() {
  setToken(null);
}
