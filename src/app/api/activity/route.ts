import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { recordVisit } from "@/lib/investor-metrics-server";

export const dynamic = "force-dynamic";

/** POST /api/activity: "this user opened the app today". Stores only the day. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  try {
    await recordVisit(session.user.id);
  } catch (err) {
    console.error("Recording visit failed:", err);
  }
  // Never an error to the browser: metrics must not get in the user's way.
  return NextResponse.json({ ok: true });
}
