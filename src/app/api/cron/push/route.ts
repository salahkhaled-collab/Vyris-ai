import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendMorningPushes } from "@/lib/push-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/cron/push — runs once an hour (vercel.json has one daily job per
 * hour, which the Hobby plan allows). Sends the morning notification to
 * users whose chosen hour it is where they live. Same CRON_SECRET as the
 * automations cron.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!sameSecret(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const r = await sendMorningPushes(now, Date.now() + 50_000).catch((err: unknown) => {
    console.error("[cron] notifications failed:", err);
    return { users: 0, sent: 0, notReached: 0 };
  });
  console.log(`[cron] notifications ${now.toISOString()}: ${r.sent} sent to ${r.users} user(s), ${r.notReached} not reached`);
  return NextResponse.json(r);
}
