import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { loadBrief } from "@/lib/morning-brief-server";
import { loadOpenCommitments } from "@/lib/commitments-server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/brief: today's brief for Home. ?inbox=1 adds "waiting on your
 * reply", which costs about a dozen Gmail calls, so the card asks for it
 * only when opened.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const now = new Date();
  try {
    const { brief, timeZone } = await loadBrief(session.user.id, now, {
      withInbox: req.nextUrl.searchParams.get("inbox") === "1",
      commitments: await loadOpenCommitments(session.user.id, now).catch(() => []),
    });
    return NextResponse.json({ brief, timeZone }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Brief failed:", err);
    return NextResponse.json({ error: "brief_failed", message: "Couldn't build today's brief." }, { status: 500 });
  }
}
