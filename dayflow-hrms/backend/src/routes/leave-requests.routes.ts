/**
 * Leave Request Routes — CONTRACT.md §5 "Leave Request Endpoints"
 *
 * Types: LeaveRequest, CreateLeaveRequest, DecideLeaveRequest, Paginated<LeaveRequest>
 * (see shared/types.ts)
 *
 * PHASE B2/B3: POST / and GET /me (the P0 vertical slice + overlap rule).
 * PHASE B4: GET / (HR list) and PATCH /:id (HR decide) now live too.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { LeaveService } from '../services/leave.service';
import { parsePagination } from '../services/pagination.util';
import type { CreateLeaveRequest, DecideLeaveRequest, LeaveStatus } from '../../../shared/types';

const router = Router();

const VALID_STATUSES: LeaveStatus[] = ['Pending', 'Approved', 'Rejected'];

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
    const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const result = await LeaveService.listOwn(employeeId, page, pageSize);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/leave-requests — HR Only — Query params -> Paginated<LeaveRequest>
router.get('/', requireAuth, requireRole('HR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const statusParam = req.query.status;
    const status =
      typeof statusParam === 'string' && (VALID_STATUSES as string[]).includes(statusParam)
        ? (statusParam as LeaveStatus)
        : undefined;
    const result = await LeaveService.listAll(page, pageSize, status);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/leave-requests/:id — HR Only — DecideLeaveRequest -> LeaveRequest
router.patch('/:id', requireAuth, requireRole('HR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const decidedBy = req.user!.employeeId;
    const updated = await LeaveService.decide(req.params.id, decidedBy, req.body as DecideLeaveRequest);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
