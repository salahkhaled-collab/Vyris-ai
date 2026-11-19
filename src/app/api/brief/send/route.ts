import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { loadBrief } from "@/lib/morning-brief-server";
import { briefEmail } from "@/lib/morning-brief";
import { emailOwner } from "@/lib/automation/engine";
import { consume, DAY } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/brief/send: email the user today's morning brief now, so a new
 * user sees it the day they sign up instead of the next morning. Same email
 * as the daily one, sent the same way (their Gmail, else Resend). 3 a day.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!(await consume(`brief-send:${session.user.id}`, 3, DAY))) {
    return NextResponse.json({ error: "rate_limited", message: "That's 3 briefs today. The next one comes tomorrow morning." }, { status: 429 });
  }
  const now = new Date();
  try {
    const { brief, timeZone } = await loadBrief(session.user.id, now, { withInbox: true });
    const email = briefEmail(brief, now, timeZone, SITE_URL);
    const outcome = await emailOwner(session.user.id, email.subject, email.body);
    if (outcome.status !== "SUCCESS") {
      return NextResponse.json({ error: "send_failed", message: outcome.detail }, { status: 502 });
    }
    return NextResponse.json({ ok: true, detail: outcome.detail });
  } catch (err) {
    console.error("Send brief now failed:", err);
    return NextResponse.json({ error: "send_failed", message: "Couldn't send the brief. Try again." }, { status: 502 });
  }
}
