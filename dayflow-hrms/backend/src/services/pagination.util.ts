/**
 * Parses `page`/`pageSize` query params with sane defaults and bounds.
 * Also accepts `limit` as an alias for `pageSize` — the frontend api-client
 * layer (frontend/src/api-client/*.ts) sends `limit`; this keeps both
 * naming conventions working without requiring a frontend-wide rename.
 */
export function parsePagination(query: Record<string, unknown>): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const rawPageSize = query.pageSize ?? query.limit ?? '20';
  const pageSize = Math.min(100, Math.max(1, parseInt(String(rawPageSize), 10) || 20));
  return { page, pageSize };
}
