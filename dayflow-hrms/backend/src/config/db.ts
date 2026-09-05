import { Pool, QueryResult } from 'pg';
import { env } from './env';
import { requestContext } from './requestContext';

// Shared PostgreSQL Pool instance
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export interface DbUserContext {
  userId?: string;
  employeeId?: string;
  role?: string;
}

/**
 * Reusable query execution helper for backend repositories/services.
 *
 * RLS enforcement: the pool connects as the non-superuser `dayflow_app` role
 * (see database/a7_rls.sql), so every table with FORCE ROW LEVEL SECURITY
 * actually applies its policy here — unlike the previous superuser
 * connection, which silently bypassed RLS for all real traffic regardless of
 * policy content. If the current request has an authenticated context (set
 * by requireAuth via ../config/requestContext.ts), each call runs inside its
 * own short transaction with that context applied via set_config, so
 * existing repository code needs no changes to get real RLS coverage.
 * Requests with no context (signup/login, before requireAuth runs) fall back
 * to a bare pool query — those repositories already call
 * withDbContext({ role: 'SYSTEM_AUTH' }, ...) explicitly instead.
 */
export const query = async (text: string, params?: unknown[]): Promise<QueryResult> => {
  const ctx = requestContext.getStore();
  if (!ctx) {
    return pool.query(text, params);
  }
  return withDbContext(ctx, (q) => q(text, params));
};

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
