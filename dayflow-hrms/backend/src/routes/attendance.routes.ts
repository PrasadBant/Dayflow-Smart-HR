/**
 * Attendance Routes — CONTRACT.md §5 "Attendance Endpoints"
 *
 * Types: Attendance, CheckInRequest, CheckOutRequest, Paginated<Attendance>
 * (see shared/types.ts)
 *
 * PHASE B4: all endpoints live.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { AttendanceService } from '../services/attendance.service';
import { parsePagination } from '../services/pagination.util';
import type { CheckInRequest, CheckOutRequest } from '../../../shared/types';

const router = Router();

// POST /api/attendance/check-in — Authenticated — CheckInRequest -> Attendance
router.post('/check-in', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AttendanceService.checkIn(req.user!.employeeId, req.body as CheckInRequest);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/attendance/check-out — Authenticated — CheckOutRequest -> Attendance
router.post('/check-out', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AttendanceService.checkOut(req.user!.employeeId, req.body as CheckOutRequest);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/me — Authenticated — Query params -> Paginated<Attendance>
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const result = await AttendanceService.listMine(req.user!.employeeId, page, pageSize);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance — HR Only — Query params -> Paginated<Attendance>
router.get('/', requireAuth, requireRole('HR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const result = await AttendanceService.listAll(page, pageSize);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
