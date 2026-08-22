/**
 * Department Routes — CONTRACT.md §5 "Department Endpoints"
 *
 * Types: Department (see shared/types.ts)
 *
 * PHASE B4: live.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../auth/middleware';
import { DepartmentsService } from '../services/departments.service';

const router = Router();

// GET /api/departments — Authenticated — None -> Department[]
router.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await DepartmentsService.list();
    res.status(200).json(departments);
  } catch (err) {
    next(err);
  }
});

export default router;
