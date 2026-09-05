import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env in application root or process CWD
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  PORT: number;
  FRONTEND_ORIGIN: string;
  NODE_ENV: string;
  /** All optional: without them, verification email delivery falls back to a
   *  logged link instead of a real send (see ../services/mailer.service.ts). */
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
}

function loadEnv(): EnvConfig {
  const DATABASE_URL = process.env.DATABASE_URL?.trim();
  const JWT_SECRET = process.env.JWT_SECRET?.trim();
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN?.trim();
  const rawPort = process.env.PORT?.trim() || '5000';
  const PORT = parseInt(rawPort, 10);
  const NODE_ENV = process.env.NODE_ENV?.trim() || 'development';

  const missing: string[] = [];

  if (!DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  if (!JWT_SECRET) {
    missing.push('JWT_SECRET');
  } else if (
    JWT_SECRET === 'your_jwt_secret_key_here' ||
    JWT_SECRET === 'dev_secret_jwt_key_dayflow_hrms_2026' ||
    JWT_SECRET === 'change_me'
  ) {
    missing.push('JWT_SECRET (insecure development placeholder rejected)');
  }

  if (!FRONTEND_ORIGIN) {
    missing.push('FRONTEND_ORIGIN');
  }

  if (isNaN(PORT) || PORT <= 0 || !Number.isInteger(PORT)) {
    missing.push('PORT (must be a valid positive integer)');
  }

  if (missing.length > 0) {
    throw new Error(`[EnvConfig] Missing or invalid required environment variable(s): ${missing.join(', ')}`);
  }

  const SMTP_HOST = process.env.SMTP_HOST?.trim() || undefined;
  const SMTP_PORT = process.env.SMTP_PORT?.trim() ? parseInt(process.env.SMTP_PORT.trim(), 10) : undefined;
  const SMTP_USER = process.env.SMTP_USER?.trim() || undefined;
  const SMTP_PASS = process.env.SMTP_PASS?.trim() || undefined;
  const SMTP_FROM = process.env.SMTP_FROM?.trim() || undefined;

  return {
    DATABASE_URL: DATABASE_URL!,
    JWT_SECRET: JWT_SECRET!,
    PORT,
    FRONTEND_ORIGIN: FRONTEND_ORIGIN!,
    NODE_ENV,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
  };
}

export const env: EnvConfig = loadEnv();
