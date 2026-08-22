/**
 * Payroll Routes — CONTRACT.md §5 "Payroll Endpoints"
 *
 * Types: Payroll, UpdatePayrollRequest (see shared/types.ts)
 *
 * PHASE B4: all endpoints live.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { PayrollService } from '../services/payroll.service';
import type { UpdatePayrollRequest } from '../../../shared/types';

const router = Router();

// GET /api/payroll/me — Authenticated — None -> Payroll[]
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await PayrollService.getMine(req.user!.employeeId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/payroll/:employeeId — HR Only — None -> Payroll[]
router.get('/:employeeId', requireAuth, requireRole('HR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await PayrollService.getForEmployee(req.params.employeeId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/payroll/:employeeId — HR Only — UpdatePayrollRequest -> Payroll
router.patch('/:employeeId', requireAuth, requireRole('HR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await PayrollService.update(req.params.employeeId, req.body as UpdatePayrollRequest);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
