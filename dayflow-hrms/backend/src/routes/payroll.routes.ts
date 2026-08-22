/**
 * Payroll Routes — CONTRACT.md §5 "Payroll Endpoints"
 *
 * Types: Payroll, UpdatePayrollRequest (see shared/types.ts)
 *
 * STUB PHASE (B1): route skeleton only. Every handler returns 501 Not Implemented.
 * Not wired into app.ts yet; no auth/config imports (see PHASE B1 fallback).
 */
import { Router, Request, Response } from 'express';

const router = Router();

function notImplemented(req: Request, res: Response): void {
  res.status(501).json({ message: `${req.method} ${req.originalUrl} not implemented yet` });
}

// GET /api/payroll/me — Authenticated — None -> Payroll[]
router.get('/me', notImplemented);

// GET /api/payroll/:employeeId — HR Only — None -> Payroll[]
router.get('/:employeeId', notImplemented);

// PATCH /api/payroll/:employeeId — HR Only — UpdatePayrollRequest -> Payroll
router.patch('/:employeeId', notImplemented);

export default router;
