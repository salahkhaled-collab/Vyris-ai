import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getGoogleAccessToken } from "@/lib/google-token";
import { completeWithPythonLlm, pythonLlmConfigured } from "@/lib/ai/python-client";
import { listNotes } from "@/lib/ai/context";
import { GmailError, getThreadForMessage, parseRecipient } from "@/lib/gmail";
import {
  parseThreadSummary,
  rateLimitMessage,
  rateLimitWait,
  replySubject,
  threadPrompt,
  threadUserMessage,
} from "@/lib/inbox-ai";

export const maxDuration = 60;

const MAX_THREAD_CHARS = 12_000;
// Only notes about HOW the user writes reach the drafter, so private notes
// (clients, plans, people) can't leak into a reply sent to someone outside.
const TONE_NOTE = /\b(tone|style|write|writing|email|emails|reply|replies|sign|signature|formal|casual|greet|greeting)\b/i;

/** POST /api/ai/inbox/summarize { messageId } — summary + reply draft. Sends nothing. */
export async function POST(req: NextRequest) {
  if (!pythonLlmConfigured()) {
    return NextResponse.json({ error: "missing_llm_url", message: "The AI isn't configured." }, { status: 500 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const messageId = (body as { messageId?: unknown } | null)?.messageId;
  if (typeof messageId !== "string" || !/^[A-Za-z0-9]+$/.test(messageId)) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  const { accessToken } = await getGoogleAccessToken(session.user.id);
  if (!accessToken) return NextResponse.json({ error: "no_gmail", message: "Connect Gmail first." }, { status: 401 });

  try {
    const thread = await getThreadForMessage(accessToken, messageId);

    // Keep the most recent messages within the size budget.
    const kept: typeof thread.messages = [];
    let used = 0;
    for (const m of [...thread.messages].reverse()) {
      if (used + m.text.length > MAX_THREAD_CHARS && kept.length > 0) break;
      kept.unshift(m);
      used += m.text.length;
    }

    const myEmail = session.user.email?.toLowerCase() ?? null;
    const { notes } = await listNotes(session.user.id, { limit: 50 });
    const toneNotes = notes.map((n) => n.content).filter((c) => TONE_NOTE.test(c)).slice(0, 5);

    const completion = await completeWithPythonLlm({
      system: threadPrompt(session.user.name ?? null, myEmail, toneNotes),
      messages: [{ role: "user", content: threadUserMessage(thread.subject, kept) }],
      maxTokens: 1500,
    });
    const summary = parseThreadSummary(completion.text);
    if (!summary) {
      return NextResponse.json({ error: "unparseable", message: "Couldn't summarise this thread. Try again." }, { status: 422 });
    }

    // Reply goes to the last person who wasn't the user, threaded on their message.
    const lastOther = [...thread.messages].reverse().find((m) => {
      const addr = parseRecipient(m.from);
      return addr !== null && addr.toLowerCase() !== myEmail;
    });
    return NextResponse.json({
      ...summary,
      reply: lastOther
        ? {
            to: parseRecipient(lastOther.from),
            subject: replySubject(thread.subject),
            threadId: thread.threadId,
            inReplyTo: lastOther.messageIdHeader || null,
          }
        : null,
    });
  } catch (err: unknown) {
    const wait = rateLimitWait(err);
    if (wait !== null) {
      return NextResponse.json({ error: "rate_limited", message: rateLimitMessage(wait), retryAfter: wait }, { status: 429 });
    }
    console.error("Thread summary failed:", err);
    const status = err instanceof GmailError && err.status === 404 ? 404 : 502;
    return NextResponse.json({ error: "summary_failed", message: "Couldn't summarise this thread right now." }, { status });
  }
}
