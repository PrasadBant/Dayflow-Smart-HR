import { AsyncLocalStorage } from 'async_hooks';
import type { DbUserContext } from './db';

/**
 * Carries the authenticated request's identity (employeeId/userId/role) across
 * the async call chain so `query()` in db.ts can apply it as the PostgreSQL
 * RLS session context (`app.current_employee_id` / `app.current_role`)
 * without every repository/service function needing an extra `ctx` parameter
 * threaded through its signature.
 *
 * Set once per request by `requireAuth` (see ../auth/middleware.ts); read by
 * `query()` in ./db.ts. Requests that never pass through `requireAuth` (e.g.
 * signup/login) have no store entry — those repositories already call
 * `withDbContext({ role: 'SYSTEM_AUTH' }, ...)` explicitly instead.
 */
export const requestContext = new AsyncLocalStorage<DbUserContext>();
