import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { completeWithPythonLlm, pythonLlmConfigured } from "@/lib/ai/python-client";

const MAX_HISTORY_MESSAGES = 10;
const MAX_TOKENS = 800;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

interface DraftContext {
  project?: { title: string; description?: string | null };
  contact?: { name: string; email?: string | null; company?: string | null; role?: string | null };
  draftNote?: string; // rough note from user: what they want to say
}

// ── System prompts ────────────────────────────────────────────────────────────

async function buildChiefOfStaffPrompt(userId: string): Promise<string> {
  const [objectives, openDecisions, activeRules] = await Promise.all([
    prisma.objective.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.decision.findMany({
      where: { ownerId: userId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.automationRule.findMany({
      where: { ownerId: userId, status: "ACTIVE" },
      take: 5,
    }),
  ]);

  const objectivesSummary = objectives.length
    ? objectives.map((o: { title: string; quarter: string }) => `- ${o.title} (${o.quarter})`).join("\n")
    : "No objectives set yet.";

  const decisionsSummary = openDecisions.length
    ? openDecisions.map((d: { title: string; deadline: string }) => `- ${d.title} — deadline: ${d.deadline}`).join("\n")
    : "No open decisions.";

  const rulesSummary = activeRules.length
    ? activeRules.map((r: { name: string; trigger: string; action: string }) => `- ${r.name}: ${r.trigger} → ${r.action}`).join("\n")
    : "No active automation rules.";

  return `You are Vyris, an AI Chief of Staff embedded in a premium executive productivity app.
Your tone is calm, precise, and direct — like a trusted senior aide, not a chatty assistant.
Keep responses concise (a few sentences to a short paragraph) unless asked for detail.

Current context for this user:

OBJECTIVES:
${objectivesSummary}

OPEN DECISIONS:
${decisionsSummary}

ACTIVE AUTOMATION RULES:
${rulesSummary}

When relevant, reference this context naturally. Do not invent context you were not given above.`;
}

function buildDraftCommsPrompt(ctx: DraftContext): string {
  const parts: string[] = [
    `You are Vyris, an AI Chief of Staff. Your job right now is communication drafting.`,
    `Produce a concise, professional email or update draft based on the user's rough note.`,
    ``,
    `Output format — respond ONLY with this structure, no preamble:`,
    `SUBJECT: <one-line subject>`,
    `---`,
    `<email body>`,
    ``,
    `Tone: direct, executive-level, warm but not casual. No filler phrases.`,
    `Length: 3–6 sentences unless the context demands more.`,
  ];

  if (ctx.contact) {
    parts.push(`\nRecipient: ${ctx.contact.name}${ctx.contact.role ? `, ${ctx.contact.role}` : ""}${ctx.contact.company ? ` at ${ctx.contact.company}` : ""}${ctx.contact.email ? ` (${ctx.contact.email})` : ""}`);
  }
  if (ctx.project) {
    parts.push(`Project context: ${ctx.project.title}${ctx.project.description ? ` — ${ctx.project.description}` : ""}`);
  }
  if (ctx.draftNote) {
    parts.push(`\nUser's rough note / intent:\n${ctx.draftNote}`);
  }

  return parts.join("\n");
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!pythonLlmConfigured()) {
    return NextResponse.json(
      {
        error: "missing_llm_url",
        message: "PYTHON_LLM_URL is not set on the server.",
      },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Sign in to talk to Vyris." },
      { status: 401 }
    );
  }

  let body: {
    messages?: IncomingMessage[];
    mode?: "chat" | "draft_comms";
    context?: DraftContext;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Request body must be JSON." },
      { status: 400 }
    );
  }

  const mode = body.mode ?? "chat";
  const ctx = body.context ?? {};


  if (mode === "draft_comms") {
    const draftNote = ctx.draftNote?.trim();
    if (!draftNote) {
      return NextResponse.json(
        { error: "missing_note", message: "Provide a rough note to draft from." },
        { status: 400 }
      );
    }

    try {
      const response = await completeWithPythonLlm({
        maxTokens: MAX_TOKENS,
        system: buildDraftCommsPrompt(ctx),
        messages: [{ role: "user", content: draftNote }],
      });

      const draft = response.text;

      // Parse subject + body out of the structured response
      const match = draft.match(/^SUBJECT:\s*(.+?)\n[-–—]+\n([\s\S]+)$/m);
      if (match) {
        return NextResponse.json({
          subject: match[1].trim(),
          body: match[2].trim(),
          raw: draft,
        });
      }
      // Fallback: return raw if format unexpected
      return NextResponse.json({ subject: "", body: draft, raw: draft });
    } catch (err) {
      console.error("Python LLM draft_comms error:", err);
      return NextResponse.json(
        { error: "python_llm_error", message: "Vyris couldn't draft right now. Try again." },
        { status: 502 }
      );
    }
  }

  // ── Chat mode (default) ───────────────────────────────────────────────────
  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json(
      { error: "empty_messages", message: "No messages provided." },
      { status: 400 }
    );
  }

  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
  try {
    const response = await completeWithPythonLlm({
      maxTokens: MAX_TOKENS,
      system: await buildChiefOfStaffPrompt(session.user.id),
      messages: trimmed,
    });

    return NextResponse.json({ reply: response.text });
  } catch (err) {
    console.error("Python LLM chat error:", err);
    return NextResponse.json(
      { error: "python_llm_error", message: "Vyris couldn't respond right now. Try again." },
      { status: 502 }
    );
  }
}
