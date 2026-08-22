/**
 * Leave Request Routes — CONTRACT.md §5 "Leave Request Endpoints"
 *
 * Types: LeaveRequest, CreateLeaveRequest, DecideLeaveRequest, Paginated<LeaveRequest>
 * (see shared/types.ts)
 *
 * STUB PHASE (B1): route skeleton only. Every handler returns 501 Not Implemented.
 * Not wired into app.ts yet; no auth/config imports (see PHASE B1 fallback).
 * NOTE: PHASE B2 will implement POST / and GET /me for real (the P0 vertical slice).
 */
import { Router, Request, Response } from 'express';

const router = Router();

function notImplemented(req: Request, res: Response): void {
  res.status(501).json({ message: `${req.method} ${req.originalUrl} not implemented yet` });
}

// POST /api/leave-requests — Authenticated — CreateLeaveRequest -> LeaveRequest (201)
router.post('/', notImplemented);

// GET /api/leave-requests/me — Authenticated — Query params -> Paginated<LeaveRequest>
router.get('/me', notImplemented);

// GET /api/leave-requests — HR Only — Query params -> Paginated<LeaveRequest>
router.get('/', notImplemented);

// PATCH /api/leave-requests/:id — HR Only — DecideLeaveRequest -> LeaveRequest
router.patch('/:id', notImplemented);

export default router;
