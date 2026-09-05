import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface SendResult {
  /** true only when the message was actually handed to a real SMTP transport. */
  delivered: boolean;
}

let transporter: Transporter | null = null;
if (env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

/**
 * Real email delivery when SMTP_* env vars are configured; otherwise falls
 * back to logging the verification link to the server console.
 *
 * This fallback is deliberately NOT hidden behind NODE_ENV — this repo's
 * only shipped deployment (docker-compose) has no mail server, and silently
 * refusing to let anyone verify their account there would be worse than the
 * current, explicitly-logged dev behavior. What changed from the previous
 * version: callers now get an honest `delivered` flag back and must not
 * claim "email sent" when it's false (see AuthService) — the fallback stays
 * truthful about itself instead of being masked by a generic success message.
 */
export const Mailer = {
  isConfigured(): boolean {
    return transporter !== null;
  },

  async sendVerificationEmail(to: string, token: string): Promise<SendResult> {
    const verifyUrl = `${env.FRONTEND_ORIGIN}/verify-email?token=${encodeURIComponent(token)}`;

    if (!transporter) {
      console.log(`[Mailer] No SMTP configured — verification link for ${to}: ${verifyUrl}`);
      return { delivered: false };
    }

    try {
      await transporter.sendMail({
        from: env.SMTP_FROM || 'no-reply@dayflow-hrms.local',
        to,
        subject: 'Verify your Dayflow HRMS account',
        text: `Welcome to Dayflow HRMS!\n\nVerify your email by opening this link:\n${verifyUrl}\n\nThis link expires in 1 hour.`,
        html: `<p>Welcome to Dayflow HRMS!</p><p><a href="${verifyUrl}">Verify your email</a></p><p>Or paste this link into your browser:<br>${verifyUrl}</p><p>This link expires in 1 hour.</p>`,
      });
      return { delivered: true };
    } catch (err) {
      // A real send attempt that failed (bad creds, SMTP down, etc.) is not
      // the same as "not configured" — log the failure distinctly, but still
      // fall back to a console link so the flow remains usable, and still
      // report delivered:false so the caller's response stays honest.
      console.error(`[Mailer] SMTP send failed for ${to}:`, err instanceof Error ? err.message : err);
      console.log(`[Mailer] Fallback verification link for ${to}: ${verifyUrl}`);
      return { delivered: false };
    }
  },

  async sendPasswordResetEmail(to: string, token: string): Promise<SendResult> {
    const resetUrl = `${env.FRONTEND_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;

    if (!transporter) {
      console.log(`[Mailer] No SMTP configured — password reset link for ${to}: ${resetUrl}`);
      return { delivered: false };
    }

    try {
      await transporter.sendMail({
        from: env.SMTP_FROM || 'no-reply@dayflow-hrms.local',
        to,
        subject: 'Reset your Dayflow HRMS password',
        text: `A password reset was requested for your Dayflow HRMS account.\n\nReset it here:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email — your password will not change.`,
        html: `<p>A password reset was requested for your Dayflow HRMS account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>Or paste this link into your browser:<br>${resetUrl}</p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email — your password will not change.</p>`,
      });
      return { delivered: true };
    } catch (err) {
      console.error(`[Mailer] SMTP send failed for ${to}:`, err instanceof Error ? err.message : err);
      console.log(`[Mailer] Fallback password reset link for ${to}: ${resetUrl}`);
      return { delivered: false };
    }
  },
};
