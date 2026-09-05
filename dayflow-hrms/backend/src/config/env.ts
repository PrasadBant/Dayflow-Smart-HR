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
  /** Required when NODE_ENV=production (see loadEnv below); optional
   *  otherwise, in which case verification/password-reset email delivery
   *  falls back to a logged link instead of a real send — see
   *  ../services/mailer.service.ts. */
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
}

/**
 * The exact fallback value docker-compose.yml ships for JWT_SECRET so
 * `docker compose up` works with zero configuration for local/demo use —
 * see .env.example. Rejected outright under NODE_ENV=production: a
 * production deployment must supply its own secret via a real .env
 * override, never rely on a value that's sitting in this repo's own
 * committed compose file.
 */
const KNOWN_COMPOSE_DEFAULT_JWT_SECRET = '1269c1c80fdd94015120dac69e2c28f3de3d3519db5aed5ebfe08a862eb6f8ac';

/** Same idea for the default `dayflow_app`/`POSTGRES_PASSWORD` values docker-compose.yml falls back to. */
const KNOWN_DEFAULT_DB_PASSWORDS = ['dayflow_app_password', 'dayflow_password'];

function loadEnv(): EnvConfig {
  const DATABASE_URL = process.env.DATABASE_URL?.trim();
  const JWT_SECRET = process.env.JWT_SECRET?.trim();
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN?.trim();
  const rawPort = process.env.PORT?.trim() || '5000';
  const PORT = parseInt(rawPort, 10);
  const NODE_ENV = process.env.NODE_ENV?.trim() || 'development';
  const isProduction = NODE_ENV === 'production';

  const SMTP_HOST = process.env.SMTP_HOST?.trim() || undefined;
  const SMTP_PORT = process.env.SMTP_PORT?.trim() ? parseInt(process.env.SMTP_PORT.trim(), 10) : undefined;
  const SMTP_USER = process.env.SMTP_USER?.trim() || undefined;
  const SMTP_PASS = process.env.SMTP_PASS?.trim() || undefined;
  const SMTP_FROM = process.env.SMTP_FROM?.trim() || undefined;

  const missing: string[] = [];

  if (!DATABASE_URL) {
    missing.push('DATABASE_URL');
  } else if (
    isProduction &&
    KNOWN_DEFAULT_DB_PASSWORDS.some((pw) => DATABASE_URL.includes(`:${pw}@`))
  ) {
    // Fails closed rather than warning: a production deployment must supply
    // its own DB credentials (APP_DB_PASSWORD / POSTGRES_PASSWORD in a real
    // .env), never inherit docker-compose.yml's own committed fallback.
    missing.push(
      'DATABASE_URL (uses a known default password from docker-compose.yml — set APP_DB_PASSWORD/POSTGRES_PASSWORD via a real .env)'
    );
  }

  if (!JWT_SECRET) {
    missing.push('JWT_SECRET');
  } else if (
    JWT_SECRET === 'your_jwt_secret_key_here' ||
    JWT_SECRET === 'dev_secret_jwt_key_dayflow_hrms_2026' ||
    JWT_SECRET === 'change_me'
  ) {
    // Rejected unconditionally (not just in production) — these three were
    // never anything but placeholder text, in any environment.
    missing.push('JWT_SECRET (insecure development placeholder rejected)');
  } else if (isProduction && JWT_SECRET === KNOWN_COMPOSE_DEFAULT_JWT_SECRET) {
    missing.push(
      'JWT_SECRET (still docker-compose.yml\'s own default value — generate your own with `openssl rand -hex 32` and set it via a real .env)'
    );
  }

  if (!FRONTEND_ORIGIN) {
    missing.push('FRONTEND_ORIGIN');
  }

  if (isNaN(PORT) || PORT <= 0 || !Number.isInteger(PORT)) {
    missing.push('PORT (must be a valid positive integer)');
  }

  if (isProduction && (!SMTP_HOST || !SMTP_FROM)) {
    // Fails closed rather than the previous warn-and-continue behavior: a
    // production deployment must be able to actually deliver verification
    // and password-reset email, not silently fall back to logging links
    // only the operator (not the affected user) can see. Development keeps
    // the explicit, documented console-log fallback — see mailer.service.ts.
    missing.push('SMTP_HOST and SMTP_FROM (required when NODE_ENV=production — see .env.example)');
  }

  if (missing.length > 0) {
    throw new Error(`[EnvConfig] Missing or invalid required environment variable(s): ${missing.join(', ')}`);
  }

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
