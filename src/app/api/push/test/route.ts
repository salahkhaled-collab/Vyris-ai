import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendMorningPush, pushPublicKey } from "@/lib/push-server";
import { consume, DAY } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST /api/push/test: send today's reminder to this user's devices now, so they see what it looks like. 5 a day. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!pushPublicKey()) return NextResponse.json({ error: "not_configured", message: "Notifications aren't set up yet." }, { status: 503 });
  if (!(await consume(`push-test:${session.user.id}`, 5, DAY))) {
    return NextResponse.json({ error: "rate_limited", message: "That's 5 tests today. Tomorrow's reminder comes in the morning." }, { status: 429 });
  }
  try {
    const r = await sendMorningPush(session.user.id, new Date(), { record: false });
    if (r.sent === 0) {
      return NextResponse.json({ error: "not_sent", message: "Couldn't reach any of your devices. Turn notifications off and on again." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent: r.sent });
  } catch (err) {
    console.error("Test notification failed:", err);
    return NextResponse.json({ error: "not_sent", message: "Couldn't send the notification. Try again." }, { status: 502 });
  }
}
