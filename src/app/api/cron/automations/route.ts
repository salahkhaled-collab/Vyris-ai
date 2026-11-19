import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runScheduled } from "@/lib/automation/engine";
import { captureDailySnapshots } from "@/lib/risk-signals-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Constant-time compare so the secret can't be guessed byte by byte. */
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/cron/automations — called once a day by Vercel Cron (vercel.json).
 * Vercel sends "Authorization: Bearer <CRON_SECRET>". Without CRON_SECRET set,
 * the endpoint refuses everyone rather than running open.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET is not set; refusing to run automations.");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  if (!sameSecret(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  const result = await runScheduled(new Date());
  console.log(`[cron] automations: ${result.rules} rule(s), ${result.failed} failed, ${result.notReached} not reached`);
  // Daily numbers for "unusual changes", with whatever time is left.
  const snapshots = await captureDailySnapshots(new Date(), started + 55_000).catch((err: unknown) => {
    console.error("[cron] snapshots failed:", err);
    return { users: 0, saved: 0 };
  });
  console.log(`[cron] snapshots: ${snapshots.saved} of ${snapshots.users} user(s)`);
  return NextResponse.json({ ...result, snapshots });
}
