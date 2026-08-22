import { Pool, QueryResult } from 'pg';
import { env } from './env';

// Shared PostgreSQL Pool instance
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Reusable query execution helper for backend repositories/services.
 */
export const query = async (text: string, params?: unknown[]): Promise<QueryResult> => {
  return pool.query(text, params);
};

export default pool;
