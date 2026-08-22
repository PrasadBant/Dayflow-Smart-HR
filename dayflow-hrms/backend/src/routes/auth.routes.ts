/**
 * Auth Routes — CONTRACT.md §5 "Auth Endpoints"
 *
 * Types: SignupRequest, LoginRequest, VerifyEmailRequest, ResendVerificationRequest,
 * AuthResponse, User (see shared/types.ts)
 *
 * All endpoints live. signup was blocked pending a Change Request (department/
 * position had no default) — resolved by CONTRACT.md §6.6 / DEFAULT_UNASSIGNED_DEPARTMENT.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import type {
  SignupRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
} from '../../../shared/types';

const router = Router();

// POST /api/auth/signup — Public — SignupRequest -> { user: User }
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.signup(req.body as SignupRequest);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
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
