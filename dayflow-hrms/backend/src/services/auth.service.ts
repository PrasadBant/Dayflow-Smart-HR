import jwt from 'jsonwebtoken';
import { AuthRepository, mapUserRow } from '../repositories/auth.repository';
import { verifyPassword } from '../auth/hash';
import { signToken } from '../auth/jwt';
import { env } from '../config/env';
import { AppError } from '../auth/errors/AppError';
import type { LoginRequest, VerifyEmailRequest, ResendVerificationRequest, AuthResponse } from '../../../shared/types';

/**
 * NOTE (PHASE B4 — signup blocked, see auth.routes.ts):
 * There is no schema column for storing an email-verification token, so
 * verification here is a self-contained, short-lived JWT — no DB round trip
 * needed to issue or check it. Distinct purpose/shape from A's session JWT
 * (`signToken`/`verifyToken` in ../auth/jwt.ts), so it's minted directly here.
 */
const EMAIL_VERIFICATION_PURPOSE = 'email_verification';
const EMAIL_VERIFICATION_EXPIRY = '1h';

interface EmailVerificationPayload {
  userId: string;
  purpose: typeof EMAIL_VERIFICATION_PURPOSE;
}

function signVerificationToken(userId: string): string {
  const payload: EmailVerificationPayload = { userId, purpose: EMAIL_VERIFICATION_PURPOSE };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: EMAIL_VERIFICATION_EXPIRY });
}

function verifyVerificationToken(token: string): EmailVerificationPayload {
  let decoded: any;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Invalid or expired verification token', 400, [
      { field: 'token', message: 'This verification link is invalid or has expired' },
    ]);
  }
  if (!decoded || decoded.purpose !== EMAIL_VERIFICATION_PURPOSE || !decoded.userId) {
    throw new AppError('VALIDATION_ERROR', 'Invalid verification token', 400);
  }
  return decoded as EmailVerificationPayload;
}

export const AuthService = {
  async login(dto: LoginRequest): Promise<AuthResponse> {
    if (!dto.email || !dto.password) {
      throw new AppError('VALIDATION_ERROR', 'Email and password are required', 400);
    }

    const userRow = await AuthRepository.findUserByEmail(dto.email);
    // Same generic message whether the email doesn't exist or the password is wrong —
    // avoids leaking which one was incorrect (user enumeration).
    const invalidCredentials = () =>
      new AppError('UNAUTHORIZED', 'Invalid email or password', 401);

    if (!userRow) throw invalidCredentials();

    const passwordOk = await verifyPassword(dto.password, userRow.password_hash);
    if (!passwordOk) throw invalidCredentials();

    if (!userRow.email_verified) {
      throw new AppError('EMAIL_NOT_VERIFIED', 'Please verify your email before logging in', 403);
    }

    const employeeId = await AuthRepository.findEmployeeIdByUserId(userRow.id);
    if (!employeeId) {
      throw new AppError('INTERNAL_ERROR', 'No employee record linked to this account', 500);
    }

    const token = signToken({ userId: userRow.id, employeeId, role: userRow.role });
    return { token, user: mapUserRow(userRow) };
  },

  async verifyEmail(dto: VerifyEmailRequest): Promise<{ message: string }> {
    if (!dto.token) {
      throw new AppError('VALIDATION_ERROR', 'Verification token is required', 400);
    }

    const { userId } = verifyVerificationToken(dto.token);
    const userRow = await AuthRepository.findUserById(userId);
    if (!userRow) {
      throw new AppError('VALIDATION_ERROR', 'Invalid verification token', 400);
    }

    if (!userRow.email_verified) {
      await AuthRepository.markEmailVerified(userId);
    }

    return { message: 'Email verified successfully. You can now log in.' };
  },

  async resendVerification(dto: ResendVerificationRequest): Promise<{ message: string }> {
    if (!dto.email) {
      throw new AppError('VALIDATION_ERROR', 'Email is required', 400);
    }

    // Always return the same generic message to avoid leaking whether an
    // account exists for this email (enumeration protection).
    const genericMessage =
      'If an account with that email exists and is not yet verified, a verification link has been sent.';

    const userRow = await AuthRepository.findUserByEmail(dto.email);
    if (userRow && !userRow.email_verified) {
      const token = signVerificationToken(userRow.id);
      // TODO: wire a real email service (out of Person B's scope — no mailer
      // dependency exists yet). Logged for local/demo use in the meantime.
      console.log(`[DEV] Email verification token for ${dto.email}: ${token}`);
    }

    return { message: genericMessage };
  },
};
