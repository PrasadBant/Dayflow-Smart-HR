import jwt from 'jsonwebtoken';
import { AuthRepository, mapUserRow } from '../repositories/auth.repository';
import { hashPassword, verifyPassword } from '../auth/hash';
import { signToken } from '../auth/jwt';
import { env } from '../config/env';
import { AppError } from '../auth/errors/AppError';
import type {
  LoginRequest,
  SignupRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  AuthResponse,
  User,
} from '../../../shared/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PG_UNIQUE_VIOLATION = '23505';

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
    if (!dto.password || dto.password.length < 8 || !/[a-zA-Z]/.test(dto.password) || !/\d/.test(dto.password)) {
      // BR-7
      throw new AppError('VALIDATION_ERROR', 'Password does not meet strength requirements', 400, [
        { field: 'password', message: 'Must be 8+ characters with at least 1 letter and 1 number' },
      ]);
    }
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

      // Mirrors resendVerification: mint + log a verification token so a
      // fresh signup can actually complete the flow in dev/demo without a
      // separate resend call. Same "no mailer dependency" TODO applies.
      const token = signVerificationToken(userRow.id);
      console.log(`[DEV] Email verification token for ${dto.email}: ${token}`);

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
