import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { adminEmails } from "@/lib/admin";
import { escapeHtml, sendEmail } from "@/lib/email";
import { MOOD_LABELS, validateFeedback } from "@/lib/feedback";
import { consume, HOUR } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/feedback { message?, mood?, page? }: saves feedback for the
 * founder and emails the owner (ADMIN_EMAILS) a copy. The email is best-effort:
 * the feedback is saved even if it can't be sent.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const v = validateFeedback(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: "invalid", message: v.error }, { status: 400 });
  if (!(await consume(`feedback:${session.user.id}`, 10, HOUR))) {
    return NextResponse.json({ error: "rate_limited", message: "Thanks! That's plenty for this hour." }, { status: 429 });
  }

  await prisma.feedback.create({ data: { userId: session.user.id, ...v.value } });

  const owner = adminEmails()[0];
  if (owner) {
    const who = session.user.name ?? session.user.email ?? "A user";
    const mood = v.value.mood ? MOOD_LABELS[v.value.mood] : null;
    await sendEmail({
      to: owner,
      subject: `Vyris feedback from ${who}${mood ? `: ${mood}` : ""}`,
      html: `<p><strong>${escapeHtml(who)}</strong>${session.user.email ? ` (${escapeHtml(session.user.email)})` : ""}${
        v.value.page ? ` on <code>${escapeHtml(v.value.page)}</code>` : ""
      }</p>${mood ? `<p>${escapeHtml(mood)}</p>` : ""}<p dir="auto" style="white-space:pre-wrap">${escapeHtml(v.value.message)}</p>`,
    }).catch(() => ({ sent: false }));
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
