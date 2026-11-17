import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getGoogleAccessToken } from "@/lib/google-token";
import { GmailError } from "@/lib/gmail";
import { applyPriorityLabels, parseAssignments } from "@/lib/gmail-labels";
import { consume, HOUR } from "@/lib/rate-limit";

export const maxDuration = 30;

/**
 * POST /api/gmail/labels { assignments: [{ id, priority }] }: puts one Vyris
 * priority label on each message in the user's own Gmail. Only labels change.
 * 403 missing_scope means the user hasn't granted label access yet.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { assignments?: unknown } | null;
  const assignments = parseAssignments(body?.assignments);
  if (!assignments) {
    return NextResponse.json({ error: "invalid", message: "Send up to 100 emails with a valid priority." }, { status: 400 });
  }

  const { accessToken, error } = await getGoogleAccessToken(session.user.id, "gmail_labels");
  if (!accessToken) {
    return error === "missing_scope" || error === "no_account"
      ? NextResponse.json({ error: "missing_scope", message: "Allow Vyris to add labels in Gmail." }, { status: 403 })
      : NextResponse.json({ error: "no_gmail", message: "Reconnect Gmail and try again." }, { status: 401 });
  }

  if (!(await consume(`gmail-labels:${session.user.id}`, 30, HOUR))) {
    return NextResponse.json({ error: "rate_limited", message: "That's a lot of labeling. Try again in a while." }, { status: 429 });
  }

  try {
    const { applied } = await applyPriorityLabels(accessToken, assignments);
    return NextResponse.json({ applied });
  } catch (err) {
    // Google says the stored grant can't modify mail (e.g. the box was unticked).
    if (err instanceof GmailError && err.status === 403) {
      return NextResponse.json({ error: "missing_scope", message: "Allow Vyris to add labels in Gmail." }, { status: 403 });
    }
    console.error("Gmail labels failed:", err);
    return NextResponse.json({ error: "labels_failed", message: "Couldn't update Gmail labels. Try again." }, { status: 502 });
  }
}
