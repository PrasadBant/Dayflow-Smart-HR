/**
 * Shared row-mapping helpers for repositories.
 * `pg` returns DATE/TIMESTAMPTZ columns as JS Date objects by default; these
 * normalize them to the ISO strings the shared types expect.
 */

/**
 * BUG FIX (B6, found against a real Postgres instance — never surfaced in
 * mocked tests since they just echo back the literal date strings fed in):
 *
 * `pg` parses a DATE column into a JS Date representing LOCAL midnight for
 * that calendar day (not UTC midnight). `.toISOString()` converts to UTC
 * first, which silently shifts the date back one day whenever the server's
 * local timezone is ahead of UTC (e.g. UTC+5:30) — every DATE-only field
 * (leave startDate/endDate, attendance attDate, payroll pay period dates,
 * employee hireDate) was off by one day in that case. Reading the LOCAL
 * Y/M/D components back out (the same way pg constructed the Date) avoids
 * the UTC round-trip entirely and is timezone-safe.
 *
 * TIMESTAMPTZ columns (created_at, check_in, decided_at, ...) are NOT
 * affected — those are real points in time, and `toISOString()` is the
 * correct representation for them. Only use this for DATE-only columns.
 */
export function toDateString(value: string | Date): string {
  if (!(value instanceof Date)) return value;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toTimestampString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}
