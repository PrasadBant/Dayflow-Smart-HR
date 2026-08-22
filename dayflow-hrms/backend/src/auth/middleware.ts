import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken, JwtPayload } from './jwt';
import type { Role } from '../../../shared/types';
import { AppError } from './errors/AppError';

// Express Request augmentation for authenticated user context
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication Middleware.
 * Reads JWT from `Authorization: Bearer <token>` header.
 * Attaches decoded payload { userId, employeeId, role } to `req.user`.
 */
export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Authentication token missing or invalid', 401);
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Authentication token missing or invalid', 401);
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based Authorization Middleware.
 * Restricts route access to specified role (e.g. 'HR').
 */
export const requireRole = (requiredRole: Role): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
      }

      if (req.user.role !== requiredRole) {
        throw new AppError('FORBIDDEN', `Access forbidden: ${requiredRole} role required`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Ownership Authorization Middleware (Strict IDOR Protection).
 * HR role bypasses check. Employees can only access their own resources.
 * @param param Exact route parameter name in req.params (e.g., 'employeeId', 'id')
 */
export const requireOwnership = (param: string): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
      }

      // HR role bypasses ownership restriction
      if (req.user.role === 'HR') {
        return next();
      }

      // Extract target employee ID strictly from route params
      const targetId = req.params ? req.params[param] : undefined;

      if (!targetId || req.user.employeeId !== String(targetId)) {
        throw new AppError('FORBIDDEN', 'Access forbidden: You can only access your own employee resource', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
