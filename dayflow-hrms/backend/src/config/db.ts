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

export interface DbUserContext {
  userId?: string;
  employeeId?: string;
  role?: string;
}

/**
 * Executes database operations within a pool client session configured with RLS context variables.
 */
export async function withDbContext<T>(
  ctx: DbUserContext | undefined,
  fn: (queryFn: (text: string, params?: unknown[]) => Promise<QueryResult>) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const empId = ctx?.employeeId || '';
    const userId = ctx?.userId || '';
    const role = ctx?.role || 'SYSTEM';
    await client.query(
      "SELECT set_config('app.current_employee_id', $1, true), set_config('app.current_user_id', $2, true), set_config('app.current_role', $3, true)",
      [empId, userId, role]
    );
    const result = await fn((text, params) => client.query(text, params));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
