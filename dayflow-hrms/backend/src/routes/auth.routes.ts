/**
 * Auth Routes — CONTRACT.md §5 "Auth Endpoints"
 *
 * Types: SignupRequest, LoginRequest, VerifyEmailRequest, ResendVerificationRequest,
 * AuthResponse, User (see shared/types.ts)
 *
 * STUB PHASE (B1): route skeleton only. Every handler returns 501 Not Implemented.
 * Not wired into app.ts yet — A's backend/src/config bootstrap is not ready
 * (see PHASE B1 fallback). No auth/config imports are used here for that reason.
 */
import { Router, Request, Response } from 'express';

const router = Router();

function notImplemented(req: Request, res: Response): void {
  res.status(501).json({ message: `${req.method} ${req.originalUrl} not implemented yet` });
}

// POST /api/auth/signup — Public — SignupRequest -> { user: User }
router.post('/signup', notImplemented);

// POST /api/auth/login — Public — LoginRequest -> AuthResponse
router.post('/login', notImplemented);

// POST /api/auth/verify-email — Public — VerifyEmailRequest -> { message: string }
router.post('/verify-email', notImplemented);

// POST /api/auth/resend-verification — Public — ResendVerificationRequest -> { message: string }
router.post('/resend-verification', notImplemented);

export default router;
