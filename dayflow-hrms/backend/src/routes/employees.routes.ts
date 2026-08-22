/**
 * Employee Routes — CONTRACT.md §5 "Employee Endpoints"
 *
 * Types: Employee, UpdateProfileRequest, Paginated<Employee>, ActivityItem,
 * EmployeeContext (see shared/types.ts)
 *
 * PHASE B4: all endpoints live.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { EmployeesService } from '../services/employees.service';
import { parsePagination } from '../services/pagination.util';
import type { UpdateProfileRequest } from '../../../shared/types';

const router = Router();

// GET /api/employees/me — Authenticated — None -> Employee
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await EmployeesService.getMe(req.user!.employeeId);
    res.status(200).json(employee);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employees/me — Authenticated — UpdateProfileRequest -> Employee
router.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await EmployeesService.updateMe(req.user!.employeeId, req.body as UpdateProfileRequest);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/recent-activity — Authenticated — None -> ActivityItem[]
router.get('/recent-activity', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await EmployeesService.recentActivity(req.user!.employeeId);
    res.status(200).json(items);
  } catch (err) {
    next(err);
  }
});

// GET /api/employees/switch-context/:id — HR Only — None -> EmployeeContext
router.get(
  '/switch-context/:id',
  requireAuth,
  requireRole('HR'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = await EmployeesService.switchContext(req.params.id);
      res.status(200).json(context);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/employees — HR Only — Query params -> Paginated<Employee>
router.get('/', requireAuth, requireRole('HR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined;
    const result = await EmployeesService.list(page, pageSize, { search, departmentId });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/employees/:id — HR Only — UpdateProfileRequest -> Employee
router.patch('/:id', requireAuth, requireRole('HR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await EmployeesService.updateById(req.params.id, req.body as UpdateProfileRequest);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
