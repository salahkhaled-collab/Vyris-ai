import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { completeWithPythonLlm, pythonLlmConfigured } from "@/lib/ai/python-client";
import { getScope } from "@/lib/task-access";
import { MAX_NOTES_CHARS, meetingNotesPrompt, parseMeetingExtraction } from "@/lib/meeting-notes";

export const maxDuration = 60;

/**
 * POST /api/ai/meeting-notes { notes }
 * Returns a proposal (summary, decisions, action items with matched owners).
 * Creates nothing: the user reviews it and creates tasks through the tasks API.
 */
export async function POST(req: NextRequest) {
  if (!pythonLlmConfigured()) {
    return NextResponse.json({ error: "missing_llm_url", message: "The AI isn't configured." }, { status: 500 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  const notes = typeof (body as { notes?: unknown } | null)?.notes === "string" ? (body as { notes: string }).notes.trim() : "";
  if (!notes) return NextResponse.json({ error: "missing_notes", message: "Paste some meeting notes first." }, { status: 400 });
  if (notes.length > MAX_NOTES_CHARS) {
    return NextResponse.json(
      { error: "too_long", message: `Notes are too long. Keep them under ${MAX_NOTES_CHARS.toLocaleString()} characters.` },
      { status: 400 }
    );
  }

  const scope = await getScope(session.user.id);
  const members = await prisma.user.findMany({
    where: scope.teamId ? { teamId: scope.teamId } : { id: scope.userId },
    select: { id: true, name: true, email: true },
    take: 200,
  });

  try {
    const completion = await completeWithPythonLlm({
      system: meetingNotesPrompt(
        new Date().toISOString().slice(0, 10),
        members.map((m) => m.name).filter((n): n is string => Boolean(n))
      ),
      messages: [{ role: "user", content: notes }],
      maxTokens: 1500,
    });
    const extraction = parseMeetingExtraction(completion.text, members);
    if (!extraction) {
      return NextResponse.json(
        { error: "unparseable", message: "Vyris couldn't read follow-ups from those notes. Try again or add more detail." },
        { status: 422 }
      );
    }
    return NextResponse.json(extraction);
  } catch (err: unknown) {
    console.error("Meeting notes extraction failed:", err);
    return NextResponse.json({ error: "python_llm_error", message: "Vyris couldn't respond right now. Try again." }, { status: 502 });
  }
}
