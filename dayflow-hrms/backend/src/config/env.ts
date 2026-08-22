import dotenv from 'dotenv';
import path from 'path';

// Attempt to load .env from dayflow-hrms root or CWD
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
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
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dayflow_hrms';
  const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_jwt_key_dayflow_hrms_2026';
  const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.VITE_API_URL || 'http://localhost:3000';
  const rawPort = process.env.PORT || '5000';
  const PORT = parseInt(rawPort, 10);
  const NODE_ENV = process.env.NODE_ENV || 'development';

  const missing: string[] = [];
  if (!DATABASE_URL) missing.push('DATABASE_URL');
  if (!JWT_SECRET) missing.push('JWT_SECRET');
  if (!FRONTEND_ORIGIN) missing.push('FRONTEND_ORIGIN');
  if (isNaN(PORT) || PORT <= 0) missing.push('PORT');

  if (missing.length > 0) {
    throw new Error(`[EnvConfig] Invalid or missing configuration: ${missing.join(', ')}`);
  }

  return {
    DATABASE_URL,
    JWT_SECRET,
    PORT,
    FRONTEND_ORIGIN,
    NODE_ENV,
  };
}

export const env: EnvConfig = loadEnv();
