// A freeform date string (from a wizard's Deadline field, or an imported
// spreadsheet cell) needs to be caught here rather than handed to Prisma raw
// -- an invalid Date would otherwise fail a save with a generic, unhelpful
// error.
export function parseOptionalDate(raw: string | null): { ok: true; value: Date | null } | { ok: false } {
  if (!raw) return { ok: true, value: null };
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? { ok: false } : { ok: true, value: date };
}
