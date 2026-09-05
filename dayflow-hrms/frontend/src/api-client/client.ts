import type { ErrorCode, ApiErrorDetail, ApiError } from '@shared/types';

/**
 * Shared with AuthContext.tsx (imports this same constant) so there is
 * exactly one place the session token lives: localStorage. Previously the
 * token was a plain in-memory module variable, set only at the moment
 * `login()` ran — a page reload wiped it (module state resets) while
 * AuthContext's own restored React state still reported the user as
 * logged in, so every request after a refresh silently lost its
 * Authorization header and failed with 401 UNAUTHORIZED even though the
 * UI looked authenticated. Reading/writing localStorage directly here
 * makes the token dynamic and reload-safe by construction, with no manual
 * sync step for callers to remember.
 */
export const AUTH_TOKEN_STORAGE_KEY = 'dayflow_auth_token';

/**
 * Fallback for environments with no `localStorage` global at all (Node.js —
 * this module is also imported directly by the ts-node E2E suites under
 * tests/e2e/, outside any browser/DOM). `typeof localStorage` there throws
 * a ReferenceError, not just an access error, so a bare try/catch around
 * `localStorage.setItem(...)` still lost the token silently: the token was
 * simply never stored anywhere, and every subsequent "authenticated" E2E
 * request went out with no Authorization header. Detect availability once
 * and keep an in-memory copy for that case; real browsers keep using
 * localStorage so the reload-survives-refresh fix stays intact there.
 */
const hasLocalStorage = typeof localStorage !== 'undefined';
let inMemoryAuthToken: string | null = null;

export function setAuthToken(token: string | null): void {
  if (!hasLocalStorage) {
    inMemoryAuthToken = token;
    return;
  }
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — degrade silently
  }
}

export function getAuthToken(): string | null {
  if (!hasLocalStorage) {
    return inMemoryAuthToken;
  }
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Standardized API Client Error matching CONTRACT.md error envelope.
 */
export class ApiClientError extends Error {
  status: number;
  code: ErrorCode;
  details?: ApiErrorDetail[] | Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code: ErrorCode,
    details?: ApiErrorDetail[] | Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Get Base API URL from environment variables or default to http://localhost:5000/api
 *
 * Deliberately reads only `process.env.VITE_API_URL` — never a literal
 * `import.meta.env` reference. This module is dual-loaded: Vite bundles it
 * for the browser, but tests/e2e/*.test.ts also `require()` it directly,
 * unbundled, via ts-node (module: "CommonJS"). TypeScript's transpileOnly
 * mode passes an `import.meta` token straight through to CommonJS output
 * uninterpreted (a real ESM-only construct), which made Node's loader
 * misdetect the whole file as an ES module on require() and crash before
 * any guard around it could run — module format is decided at parse time,
 * so a runtime `typeof import.meta !== 'undefined'` check never helped.
 * vite.config.ts's `define` statically replaces `process.env.VITE_API_URL`
 * with the build-time value for the browser bundle, so this single branch
 * covers both runtimes without ever emitting that token.
 */
export function getBaseApiUrl(): string {
  if (typeof process !== 'undefined' && process.env?.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  return 'http://localhost:5000/api';
}

/**
 * Reusable HTTP Request Wrapper for real network calls.
 */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseApiUrl().replace(/\/$/, '');
  const normalizedPath = path.replace(/^\//, '');
  const url = `${baseUrl}/${normalizedPath}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const authToken = getAuthToken();
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // 401 means the session token is missing, expired, or was signed by a
    // backend instance we're no longer talking to (e.g. after a secret
    // rotation) — never something the user can retry their way out of.
    // Clear it here, once, at the single choke point every request passes
    // through, and let AuthContext react (see the 'dayflow:auth-invalid'
    // listener there) instead of leaving a dead token behind for every
    // subsequent call to fail against individually.
    if (response.status === 401) {
      setAuthToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dayflow:auth-invalid'));
      }
    }

    let errorEnvelope: ApiError | null = null;
    try {
      errorEnvelope = await response.json();
    } catch {
      // Failed to parse JSON error envelope
    }

    if (errorEnvelope && errorEnvelope.error) {
      throw new ApiClientError(
        errorEnvelope.error.message,
        response.status,
        errorEnvelope.error.code,
        errorEnvelope.error.details
      );
    }

    throw new ApiClientError(
      response.statusText || 'HTTP Request Failed',
      response.status,
      response.status === 401 ? 'UNAUTHORIZED' :
      response.status === 403 ? 'FORBIDDEN' :
      response.status === 404 ? 'NOT_FOUND' :
      response.status === 409 ? 'CONFLICT' :
      response.status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'
    );
  }

  // Check 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
