// Owner-only screens (e.g. the waitlist list). Who counts as an owner comes
// from the ADMIN_EMAILS environment variable (comma-separated), so no address
// is written into the code. Unset means nobody: the screens stay closed.

export function adminEmails(raw: string | undefined = process.env.ADMIN_EMAILS): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined, raw?: string): boolean {
  if (!email) return false;
  return adminEmails(raw).includes(email.trim().toLowerCase());
}

/** One CSV cell: quoted, and spreadsheet formulas neutralised (=, +, -, @ at the start). */
export function csvCell(value: string | null | undefined): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}
