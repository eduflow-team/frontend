import type { ApiErrorBody } from './types';
import { API_ENDPOINTS } from './endpoints';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const TOKEN_KEYS = {
  access: 'eduflow_access_token',
  refresh: 'eduflow_refresh_token',
} as const;

export class ApiError extends Error {
  readonly status: number;
  readonly body?: ApiErrorBody;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.access);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_KEYS.refresh);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEYS.access, accessToken);
  localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  localStorage.removeItem('eduflow_token');
}

function formatErrorDetail(body?: ApiErrorBody): string {
  if (!body?.detail) return '';
  if (typeof body.detail === 'string') return body.detail;
  if (Array.isArray(body.detail)) {
    return body.detail.map((d) => d.msg).filter(Boolean).join(', ');
  }
  return '';
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}${API_ENDPOINTS.auth.refresh}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!response.ok) {
          clearTokens();
          return false;
        }
        const data = (await response.json()) as {
          access_token: string;
          refresh_token: string;
        };
        setTokens(data.access_token, data.refresh_token);
        return true;
      } catch {
        clearTokens();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  opts?: { skipAuth?: boolean; _retried?: boolean },
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!opts?.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !opts?.skipAuth && !opts?._retried) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiRequest<T>(path, options, { ...opts, _retried: true });
    }
  }

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    const message =
      formatErrorDetail(body) || `요청에 실패했습니다. (${response.status})`;
    throw new ApiError(message, response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string, opts?: { skipAuth?: boolean }) =>
    apiRequest<T>(path, {}, opts),
  post: <T>(path: string, body?: unknown, opts?: { skipAuth?: boolean }) =>
    apiRequest<T>(
      path,
      {
        method: 'POST',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      opts,
    ),
  put: <T>(path: string, body?: unknown, opts?: { skipAuth?: boolean }) =>
    apiRequest<T>(
      path,
      {
        method: 'PUT',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      opts,
    ),
  patch: <T>(path: string, body?: unknown, opts?: { skipAuth?: boolean }) =>
    apiRequest<T>(
      path,
      {
        method: 'PATCH',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      opts,
    ),
  delete: <T>(path: string, opts?: { skipAuth?: boolean }) =>
    apiRequest<T>(path, { method: 'DELETE' }, opts),
};
