import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runScheduled } from "@/lib/automation/engine";

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
  const result = await runScheduled(new Date());
  console.log(`[cron] automations: ${result.rules} rule(s), ${result.failed} failed, ${result.notReached} not reached`);
  return NextResponse.json(result);
}
