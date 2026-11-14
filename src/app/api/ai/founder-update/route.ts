import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { completeWithPythonLlm, pythonLlmConfigured } from "@/lib/ai/python-client";
import { consume, HOUR } from "@/lib/rate-limit";
import { rateLimitWait } from "@/lib/inbox-ai";
import { loadUpdateFacts } from "@/lib/founder-update-server";
import {
  AUDIENCES,
  MAX_NOTE,
  factsText,
  parseUpdateDraft,
  templateUpdate,
  unverifiedNumbers,
  updatePrompt,
  updateUserMessage,
  type Audience,
} from "@/lib/founder-update";

export const maxDuration = 60;
const DRAFTS_PER_HOUR = 10;

/**
 * POST /api/ai/founder-update { audience, note? }: drafts the weekly update
 * from workspace facts. Sends nothing. Returns the facts used, and any number
 * in the draft that isn't in them, so the founder can check before sending.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { audience?: unknown; note?: unknown } | null;
  const audience: Audience = (AUDIENCES as readonly string[]).includes(String(body?.audience)) ? (body?.audience as Audience) : "investors";
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (note.length > MAX_NOTE) {
    return NextResponse.json({ error: "invalid", message: `Keep the note under ${MAX_NOTE} characters.` }, { status: 400 });
  }
  if (!(await consume(`founder-update:${session.user.id}`, DRAFTS_PER_HOUR, HOUR))) {
    return NextResponse.json({ error: "rate_limited", message: "That's 10 drafts this hour. Edit the last one, or try again later." }, { status: 429 });
  }

  const { facts } = await loadUpdateFacts(session.user.id);
  const facts_ = factsText(facts);

  let draft = null;
  let source: "ai" | "template" = "ai";
  let notice: string | null = null;
  if (pythonLlmConfigured()) {
    try {
      const completion = await completeWithPythonLlm({
        system: updatePrompt(audience, session.user.name ?? null),
        messages: [{ role: "user", content: updateUserMessage(facts, note) }],
        maxTokens: 1200,
        timeoutMs: 40_000,
      });
      draft = parseUpdateDraft(completion.text);
    } catch (err) {
      console.error("Founder update draft failed:", err);
      if (rateLimitWait(err) !== null) notice = "The AI is at its free-plan limit, so this is a plain draft from your data.";
    }
  }
  if (!draft) {
    source = "template";
    draft = templateUpdate(facts, audience, note);
    notice ??= "The AI couldn't write this one, so this is a plain draft from your data.";
  }

  return NextResponse.json({
    ...draft,
    source,
    notice: source === "template" ? notice : null,
    facts: facts_,
    check: unverifiedNumbers(draft, facts, note),
  });
}
