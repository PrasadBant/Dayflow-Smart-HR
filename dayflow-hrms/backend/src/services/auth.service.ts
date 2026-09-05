import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthRepository, mapUserRow } from '../repositories/auth.repository';
import { hashPassword, verifyPassword } from '../auth/hash';
import { signToken } from '../auth/jwt';
import { env } from '../config/env';
import { AppError } from '../auth/errors/AppError';
import { Mailer } from './mailer.service';
import type {
  LoginRequest,
  SignupRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthResponse,
  User,
} from '../../../shared/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PG_UNIQUE_VIOLATION = '23505';

/** BR-7, shared between signup and password reset. */
function assertPasswordStrength(password: string | undefined): asserts password is string {
  if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    throw new AppError('VALIDATION_ERROR', 'Password does not meet strength requirements', 400, [
      { field: 'password', message: 'Must be 8+ characters with at least 1 letter and 1 number' },
    ]);
  }
}

const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/** The DB stores only this hash, never the raw token (see schema.sql). */
function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Note: there is no schema column for storing an email-verification token, so
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
  /**
   * BR-2 / CONTRACT.md §6.5: role is never read from the request body — the
   * DB insert hardcodes role='EMPLOYEE' (see AuthRepository.createUserWithEmployee).
   * CONTRACT.md §6.6: new employees default to the Unassigned department and
   * 'Employee' position; HR corrects these later via PATCH /api/employees/:id.
   */
  async signup(dto: SignupRequest): Promise<{ user: User }> {
    if (!dto.email || !EMAIL_RE.test(dto.email)) {
      throw new AppError('VALIDATION_ERROR', 'A valid email is required', 400, [
        { field: 'email', message: 'Must be a valid email address' },
      ]);
    }
    assertPasswordStrength(dto.password);
    if (!dto.firstName?.trim() || !dto.lastName?.trim()) {
      throw new AppError('VALIDATION_ERROR', 'First name and last name are required', 400);
    }

    const existing = await AuthRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new AppError('EMAIL_TAKEN', 'An account with this email already exists', 409);
    }

    if (dto.employeeCode) {
      const taken = await AuthRepository.isEmployeeCodeTaken(dto.employeeCode);
      if (taken) {
        throw new AppError('CONFLICT', 'This employee code is already in use', 409, [
          { field: 'employeeCode', message: 'Choose a different employee code' },
        ]);
      }
    }

    const passwordHash = await hashPassword(dto.password);

    try {
      const userRow = await AuthRepository.createUserWithEmployee({
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        employeeCode: dto.employeeCode,
      });

      // Mirrors resendVerification: mint + attempt delivery of a verification
      // token so a fresh signup can complete the flow without a separate
      // resend call. Falls back to a logged link when no SMTP is configured
      // (see mailer.service.ts) — signup's response shape is `{ user }` only
      // per contract, so there's nowhere to surface delivered/not-delivered
      // here; resendVerification is the retry path if the email never arrives.
      const token = signVerificationToken(userRow.id);
      await Mailer.sendVerificationEmail(dto.email, token);

      return { user: mapUserRow(userRow) };
    } catch (err: any) {
      if (err && err.code === PG_UNIQUE_VIOLATION) {
        throw new AppError('EMAIL_TAKEN', 'An account with this email or employee code already exists', 409);
      }
      throw err;
    }
  },

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
    if (!dto.email || !EMAIL_RE.test(dto.email)) {
      throw new AppError('VALIDATION_ERROR', 'A valid email is required', 400, [
        { field: 'email', message: 'Must be a valid email address' },
      ]);
    }

    const userRow = await AuthRepository.findUserByEmail(dto.email);
    if (userRow && !userRow.email_verified) {
      const token = signVerificationToken(userRow.id);
      await Mailer.sendVerificationEmail(dto.email, token);
    }

    // The message must depend ONLY on whether this server has real email
    // delivery configured — a fact that's the same for every caller — never
    // on whether this particular account exists, or the branch choice itself
    // would leak account existence (the whole point of the generic wording).
    // Whether delivery is configured is still something real, though: saying
    // "a verification link has been sent" when nothing was ever emailed
    // (because no SMTP is configured at all) is a fabricated success.
    return Mailer.isConfigured()
      ? {
          message: 'If an account with that email exists and is not yet verified, a verification link has been sent.',
        }
      : {
          message:
            'If an account with that email exists and is not yet verified, a verification link was generated, ' +
            'but this server has no email delivery configured — check the server logs for the link.',
        };
  },

  /**
   * Enumeration-safe by the same pattern as resendVerification: the response
   * message depends only on whether SMTP is configured server-wide, never on
   * whether the requested account exists. Rate-limited at the route layer
   * (shared authRateLimiter on /api/auth/*), same as login/signup.
   */
  async forgotPassword(dto: ForgotPasswordRequest): Promise<{ message: string }> {
    if (!dto.email || !EMAIL_RE.test(dto.email)) {
      throw new AppError('VALIDATION_ERROR', 'A valid email is required', 400, [
        { field: 'email', message: 'Must be a valid email address' },
      ]);
    }

    const userRow = await AuthRepository.findUserByEmail(dto.email);
    if (userRow) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);
      await AuthRepository.setPasswordResetToken(userRow.id, hashResetToken(rawToken), expiresAt);
      await Mailer.sendPasswordResetEmail(dto.email, rawToken);
    }

    return Mailer.isConfigured()
      ? { message: 'If an account with that email exists, a password reset link has been sent.' }
      : {
          message:
            'If an account with that email exists, a password reset link was generated, ' +
            'but this server has no email delivery configured — check the server logs for the link.',
        };
  },

  /**
   * The token is a random 32-byte value (never a JWT) specifically so it can
   * be tracked server-side as single-use: resetPassword() clears the stored
   * hash unconditionally on success, so a second attempt with the same
   * (otherwise still-time-valid) token always fails, unlike a stateless JWT
   * which would stay valid until its own expiry regardless of prior use.
   */
  async resetPassword(dto: ResetPasswordRequest): Promise<{ message: string }> {
    if (!dto.token) {
      throw new AppError('VALIDATION_ERROR', 'Reset token is required', 400);
    }
    assertPasswordStrength(dto.newPassword);

    const userRow = await AuthRepository.findUserByValidResetTokenHash(hashResetToken(dto.token));
    if (!userRow) {
      throw new AppError('VALIDATION_ERROR', 'Invalid or expired reset token', 400, [
        { field: 'token', message: 'This reset link is invalid or has expired' },
      ]);
    }

    const newPasswordHash = await hashPassword(dto.newPassword);
    await AuthRepository.resetPassword(userRow.id, newPasswordHash);

    // Session invalidation note: sessions are stateless JWTs with an 8h
    // expiry and no server-side revocation list — a token issued before
    // this reset stays valid for the rest of its own lifetime. The reset
    // token itself is what's guaranteed single-use here; revoking existing
    // login sessions on password change would need a token-blocklist or a
    // per-user token version, which doesn't exist in this codebase today.
    return { message: 'Password reset successfully. You can now log in with your new password.' };
  },
};
