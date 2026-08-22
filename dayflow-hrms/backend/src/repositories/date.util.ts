/**
 * Shared row-mapping helpers for repositories.
 * `pg` returns DATE/TIMESTAMPTZ columns as JS Date objects by default; these
 * normalize them to the ISO strings the shared types expect.
 */

export function toDateString(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

export function toTimestampString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}
