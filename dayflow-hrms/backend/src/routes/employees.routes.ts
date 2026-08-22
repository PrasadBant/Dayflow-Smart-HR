/**
 * Employee Routes — CONTRACT.md §5 "Employee Endpoints"
 *
 * Types: Employee, UpdateProfileRequest, Paginated<Employee>, ActivityItem,
 * EmployeeContext (see shared/types.ts)
 *
 * STUB PHASE (B1): route skeleton only. Every handler returns 501 Not Implemented.
 * Not wired into app.ts yet; no auth/config imports (see PHASE B1 fallback).
 */
import { Router, Request, Response } from 'express';

const router = Router();

function notImplemented(req: Request, res: Response): void {
  res.status(501).json({ message: `${req.method} ${req.originalUrl} not implemented yet` });
}

// GET /api/employees/me — Authenticated — None -> Employee
router.get('/me', notImplemented);

// PATCH /api/employees/me — Authenticated — UpdateProfileRequest -> Employee
router.patch('/me', notImplemented);

// GET /api/employees/recent-activity — Authenticated — None -> ActivityItem[]
router.get('/recent-activity', notImplemented);

// GET /api/employees/switch-context/:id — HR Only — None -> EmployeeContext
router.get('/switch-context/:id', notImplemented);

// GET /api/employees — HR Only — Query params -> Paginated<Employee>
router.get('/', notImplemented);

// PATCH /api/employees/:id — HR Only — UpdateProfileRequest -> Employee
router.patch('/:id', notImplemented);

export default router;
