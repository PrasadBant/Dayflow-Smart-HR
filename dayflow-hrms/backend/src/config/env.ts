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

  return {
    DATABASE_URL: DATABASE_URL!,
    JWT_SECRET: JWT_SECRET!,
    PORT,
    FRONTEND_ORIGIN: FRONTEND_ORIGIN!,
    NODE_ENV,
  };
}

export const env: EnvConfig = loadEnv();
