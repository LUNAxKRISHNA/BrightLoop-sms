// Talks to the server. The sign-in token lives in sessionStorage so a refresh keeps you signed in.

const TOKEN_KEY = 'brightloop.token';

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: the session just won't survive a refresh.
  }
}

/** JSON fetch against the server; throws the server's `error` message on failure. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401) setToken(null);
  if (!res.ok) throw new Error(body?.error ?? 'Something went wrong. Try again.');
  return body as T;
}
