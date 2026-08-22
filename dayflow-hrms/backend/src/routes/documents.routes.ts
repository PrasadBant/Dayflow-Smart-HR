/**
 * Document Routes — CONTRACT.md §5 "Document Endpoints"
 *
 * Types: Document, CreateDocumentMetadataRequest (see shared/types.ts)
 *
 * STUB PHASE (B1): route skeleton only. Every handler returns 501 Not Implemented.
 * Not wired into app.ts yet; no auth/config imports (see PHASE B1 fallback).
 */
import { Router, Request, Response } from 'express';

const router = Router();

function notImplemented(req: Request, res: Response): void {
  res.status(501).json({ message: `${req.method} ${req.originalUrl} not implemented yet` });
}

// GET /api/documents/me — Authenticated — None -> Document[]
router.get('/me', notImplemented);

// GET /api/documents/:employeeId — HR Only — None -> Document[]
router.get('/:employeeId', notImplemented);

// POST /api/documents — Authenticated/HR — CreateDocumentMetadataRequest -> Document
router.post('/', notImplemented);

export default router;
