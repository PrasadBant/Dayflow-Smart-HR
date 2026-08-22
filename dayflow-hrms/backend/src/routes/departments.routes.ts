/**
 * Department Routes — CONTRACT.md §5 "Department Endpoints"
 *
 * Types: Department (see shared/types.ts)
 *
 * STUB PHASE (B1): route skeleton only. Every handler returns 501 Not Implemented.
 * Not wired into app.ts yet; no auth/config imports (see PHASE B1 fallback).
 */
import { Router, Request, Response } from 'express';

const router = Router();

function notImplemented(req: Request, res: Response): void {
  res.status(501).json({ message: `${req.method} ${req.originalUrl} not implemented yet` });
}

// GET /api/departments — Authenticated — None -> Department[]
router.get('/', notImplemented);

export default router;
