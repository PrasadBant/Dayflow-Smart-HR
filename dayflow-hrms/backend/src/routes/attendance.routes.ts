/**
 * Attendance Routes — CONTRACT.md §5 "Attendance Endpoints"
 *
 * Types: Attendance, CheckInRequest, CheckOutRequest, Paginated<Attendance>
 * (see shared/types.ts)
 *
 * STUB PHASE (B1): route skeleton only. Every handler returns 501 Not Implemented.
 * Not wired into app.ts yet; no auth/config imports (see PHASE B1 fallback).
 */
import { Router, Request, Response } from 'express';

const router = Router();

function notImplemented(req: Request, res: Response): void {
  res.status(501).json({ message: `${req.method} ${req.originalUrl} not implemented yet` });
}

// POST /api/attendance/check-in — Authenticated — CheckInRequest -> Attendance
router.post('/check-in', notImplemented);

// POST /api/attendance/check-out — Authenticated — CheckOutRequest -> Attendance
router.post('/check-out', notImplemented);

// GET /api/attendance/me — Authenticated — Query params -> Paginated<Attendance>
router.get('/me', notImplemented);

// GET /api/attendance — HR Only — Query params -> Paginated<Attendance>
router.get('/', notImplemented);

export default router;
