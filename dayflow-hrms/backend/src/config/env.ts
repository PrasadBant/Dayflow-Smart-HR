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

/**
 * docker-compose.yml ships working fallback values (a generated JWT secret,
 * a default DB password, no SMTP) so `docker compose up` with no .env file
 * works out of the box for local/demo use — see .env.example. That
 * convenience is exactly what makes it easy to silently carry into a real
 * deployment, though, so this makes the risk loud and unmissable in the
 * startup logs instead of failing to start (which would make the project's
 * own one-command quickstart unusable for anyone without external SMTP/
 * secret-management set up first). Called once from index.ts at boot.
 */
const KNOWN_COMPOSE_DEFAULT_JWT_SECRET = '1269c1c80fdd94015120dac69e2c28f3de3d3519db5aed5ebfe08a862eb6f8ac';

export function warnOnInsecureProductionDefaults(): void {
  if (env.NODE_ENV !== 'production') return;

  const warnings: string[] = [];
  if (env.JWT_SECRET === KNOWN_COMPOSE_DEFAULT_JWT_SECRET) {
    warnings.push('JWT_SECRET is still the value docker-compose.yml generates by default — set a real secret via a root .env (see .env.example) before this handles real user data.');
  }
  if (env.DATABASE_URL.includes(':dayflow_app_password@') || env.DATABASE_URL.includes(':dayflow_password@')) {
    warnings.push('DATABASE_URL is still using the default docker-compose password — override APP_DB_PASSWORD/POSTGRES_PASSWORD via a root .env before this handles real data.');
  }
  if (!env.SMTP_HOST) {
    warnings.push('No SMTP_* configured — signup/password-reset emails are only logged to this console, never actually delivered. Real users cannot verify accounts or reset passwords without reading server logs. Set SMTP_HOST/PORT/USER/PASS/FROM (see .env.example) before onboarding real users.');
  }

  if (warnings.length > 0) {
    console.warn('='.repeat(70));
    console.warn('[EnvConfig] Running with NODE_ENV=production but insecure/incomplete configuration:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
    console.warn('='.repeat(70));
  }
}
