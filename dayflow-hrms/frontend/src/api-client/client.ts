import type { ErrorCode, ApiErrorDetail, ApiError } from '../../../../shared/types';

/**
 * Global mock mode flag.
 * Default is `true` for Phase D1 so frontend (Person C) can work immediately without a running backend.
 */
export let USE_MOCKS = true;

export function setUseMocks(useMocks: boolean): void {
  USE_MOCKS = useMocks;
}

export function getUseMocks(): boolean {
  return USE_MOCKS;
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
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
 */
export function getBaseApiUrl(): string {
  if (typeof process !== 'undefined' && process.env?.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
      return (import.meta as any).env.VITE_API_URL;
    }
  } catch {
    // Ignore environment lookup errors in non-bundled contexts
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

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
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

/**
 * Helper to simulate network latency for mock data.
 */
export function mockDelay<T>(data: T, delayMs = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
}
