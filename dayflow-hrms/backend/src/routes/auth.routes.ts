/**
 * Auth Routes — CONTRACT.md §5 "Auth Endpoints"
 *
 * Types: SignupRequest, LoginRequest, VerifyEmailRequest, ResendVerificationRequest,
 * AuthResponse, User (see shared/types.ts)
 *
 * PHASE B4: login, verify-email, resend-verification are live.
 *
 * signup remains 501 — BLOCKED, not a stub oversight. See the comment on the
 * handler below for the exact conflict; reported to the team, needs A's input.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import type { LoginRequest, VerifyEmailRequest, ResendVerificationRequest } from '../../../shared/types';

const router = Router();

/**
 * POST /api/auth/signup — Public — SignupRequest -> { user: User }
 *
 * BLOCKED: `employees.department_id` and `employees.position` are NOT NULL
 * with no default in database/schema.sql, and no "unassigned"/placeholder
 * department is seeded — but `SignupRequest` in shared/types.ts has no
 * departmentId/position field, and C's SignupPage.tsx (already built)
 * doesn't collect them either. There's no non-arbitrary way to satisfy the
 * employees insert from what signup actually receives.
 * This needs a Change Request to A (extend SignupRequest, or seed a default
 * department + position) before it can be implemented — not something to
 * guess at in the service layer. See conversation notes for Person B, PHASE B4.
 */
router.post('/signup', (req: Request, res: Response) => {
  res.status(501).json({ message: `${req.method} ${req.originalUrl} not implemented yet` });
});

// POST /api/auth/login — Public — LoginRequest -> AuthResponse
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.login(req.body as LoginRequest);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-email — Public — VerifyEmailRequest -> { message: string }
router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.verifyEmail(req.body as VerifyEmailRequest);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-verification — Public — ResendVerificationRequest -> { message: string }
router.post('/resend-verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.resendVerification(req.body as ResendVerificationRequest);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
