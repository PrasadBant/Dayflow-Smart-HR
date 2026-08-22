import type {
  LoginRequest,
  AuthResponse,
  SignupRequest,
  User,
  VerifyEmailRequest,
  CreateLeaveRequest,
  LeaveRequest,
  DecideLeaveRequest,
  Paginated,
  ApiError
} from '../../../../shared/types';

export interface AuthApiClient {
  login?: (body: LoginRequest) => Promise<AuthResponse>;
  signup?: (body: SignupRequest) => Promise<{ user: User }>;
  verifyEmail?: (body: VerifyEmailRequest) => Promise<{ message?: string } | void>;
}

export interface LeaveApiClient {
  create?: (body: CreateLeaveRequest) => Promise<LeaveRequest>;
  listMine?: () => Promise<Paginated<LeaveRequest> | LeaveRequest[]>;
  listPending?: () => Promise<Paginated<LeaveRequest> | LeaveRequest[]>;
  decide?: (id: string, body: DecideLeaveRequest) => Promise<LeaveRequest>;
}

export interface ParsedApiError {
  code?: string;
  message: string;
  details?: unknown;
}

export function parseApiError(err: unknown): ParsedApiError {
  if (err && typeof err === 'object') {
    if ('error' in err) {
      const apiErr = (err as ApiError).error;
      if (apiErr) {
        return {
          code: apiErr.code,
          message: apiErr.message || 'An error occurred during request processing.',
          details: apiErr.details,
        };
      }
    }
    const errObj = err as Record<string, unknown>;
    if (typeof errObj.code === 'string') {
      return {
        code: errObj.code as string,
        message: typeof errObj.message === 'string' ? errObj.message : 'Request failed.',
      };
    }
    if (typeof errObj.cause === 'string') {
      return {
        code: errObj.cause,
        message: typeof errObj.message === 'string' ? errObj.message : 'Request failed.',
      };
    }
    if (typeof errObj.message === 'string') {
      return {
        message: errObj.message,
      };
    }
  }

  return {
    message: 'An unexpected error occurred. Please check your network connection and try again.',
  };
}
