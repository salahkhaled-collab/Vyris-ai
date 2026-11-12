import { prisma } from "@/lib/prisma";

/**
 * Fixed-window abuse limits stored in Postgres, so they hold across
 * serverless instances. Not for high-volume traffic: one upsert per call.
 */

/** Whether a window that started at `windowStart` is still open at `now`. */
export function windowOpen(windowStart: Date, windowMs: number, now: Date): boolean {
  return now.getTime() - windowStart.getTime() < windowMs;
}

/** Count one event for `key`. Returns false once more than `limit` happened in the window. */
export async function consume(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const row = await prisma.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, windowStart: now },
    update: { count: { increment: 1 } },
  });
  if (!windowOpen(row.windowStart, windowMs, now)) {
    await prisma.rateLimit.update({ where: { key }, data: { count: 1, windowStart: now } });
    return true;
  }
  return row.count <= limit;
}

/** Whether `key` is already over `limit` in the current window, without counting. */
export async function isLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  if (!row) return false;
  return windowOpen(row.windowStart, windowMs, new Date()) && row.count >= limit;
}

export async function resetLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
