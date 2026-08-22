import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { Role } from '../../../shared/types';
import { AppError } from './errors/AppError';

export interface JwtPayload {
  userId: string;
  employeeId: string;
  role: Role;
}

/**
 * Signs a JWT authentication token with an 8-hour expiry.
 */
export function signToken(payload: JwtPayload): string {
  if (!payload.userId || !payload.employeeId || !payload.role) {
    throw new AppError('VALIDATION_ERROR', 'Invalid token payload: userId, employeeId, and role are required', 400);
  }

  if (payload.role !== 'EMPLOYEE' && payload.role !== 'HR') {
    throw new AppError('VALIDATION_ERROR', 'Invalid token payload: role must be EMPLOYEE or HR', 400);
  }

  return jwt.sign(
    {
      userId: payload.userId,
      employeeId: payload.employeeId,
      role: payload.role,
    },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

/**
 * Verifies and decodes a JWT authentication token.
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !decoded.userId ||
      !decoded.employeeId ||
      !decoded.role ||
      (decoded.role !== 'EMPLOYEE' && decoded.role !== 'HR')
    ) {
      throw new AppError('UNAUTHORIZED', 'Invalid authentication token payload', 401);
    }

    return {
      userId: String(decoded.userId),
      employeeId: String(decoded.employeeId),
      role: decoded.role as Role,
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error?.name === 'TokenExpiredError') {
      throw new AppError('UNAUTHORIZED', 'Authentication token has expired', 401);
    }
    throw new AppError('UNAUTHORIZED', 'Invalid or corrupted authentication token', 401);
  }
}
