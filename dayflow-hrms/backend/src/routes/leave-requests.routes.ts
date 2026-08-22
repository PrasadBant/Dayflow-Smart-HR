/**
 * Leave Request Routes — CONTRACT.md §5 "Leave Request Endpoints"
 *
 * Types: LeaveRequest, CreateLeaveRequest, DecideLeaveRequest, Paginated<LeaveRequest>
 * (see shared/types.ts)
 *
 * PHASE B2: POST / and GET /me are live (the P0 vertical slice).
 * GET / (HR list) and PATCH /:id (HR decide) remain 501 stubs until PHASE B4.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../auth/middleware';
import { LeaveService } from '../services/leave.service';
import type { CreateLeaveRequest } from '../../../shared/types';

const router = Router();

function notImplemented(req: Request, res: Response): void {
  res.status(501).json({ message: `${req.method} ${req.originalUrl} not implemented yet` });
}

// POST /api/leave-requests — Authenticated — CreateLeaveRequest -> LeaveRequest (201)
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.user!.employeeId;
    const dto = req.body as CreateLeaveRequest;
    const created = await LeaveService.create(employeeId, dto);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// GET /api/leave-requests/me — Authenticated — Query params -> Paginated<LeaveRequest>
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeId = req.user!.employeeId;
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));
    const result = await LeaveService.listOwn(employeeId, page, pageSize);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/leave-requests — HR Only — Query params -> Paginated<LeaveRequest>
router.get('/', notImplemented);

// PATCH /api/leave-requests/:id — HR Only — DecideLeaveRequest -> LeaveRequest
router.patch('/:id', notImplemented);

export default router;
