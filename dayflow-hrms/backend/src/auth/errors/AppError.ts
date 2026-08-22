import type { ErrorCode, ApiErrorDetail } from '../../../../shared/types';

/**
 * Standardized Custom Application Error.
 * Compatible with central error middleware in backend/src/app.ts.
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown> | ApiErrorDetail[];

  constructor(
    code: ErrorCode,
    message: string,
    status: number = 400,
    details?: Record<string, unknown> | ApiErrorDetail[]
  ) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.statusCode = status;
    this.code = code;
    this.details = details;

    // Restore prototype chain for Error subclassing in ES5/ES6
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
