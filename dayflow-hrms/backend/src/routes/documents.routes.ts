/**
 * Document Routes — CONTRACT.md §5 "Document Endpoints"
 *
 * Types: Document, CreateDocumentMetadataRequest (see shared/types.ts)
 *
 * PHASE B4: all endpoints live. Metadata only — no file upload.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { DocumentsService } from '../services/documents.service';
import type { CreateDocumentMetadataRequest } from '../../../shared/types';

const router = Router();

// GET /api/documents/me — Authenticated — None -> Document[]
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await DocumentsService.getMine(req.user!.employeeId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:employeeId — HR Only — None -> Document[]
router.get('/:employeeId', requireAuth, requireRole('HR'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await DocumentsService.getForEmployee(req.params.employeeId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/documents — Authenticated/HR — CreateDocumentMetadataRequest -> Document
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await DocumentsService.create(
      req.user!.employeeId,
      req.user!.role,
      req.body as CreateDocumentMetadataRequest
    );
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

export default router;
