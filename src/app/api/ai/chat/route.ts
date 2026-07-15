import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { priorityLedger, decisions, automationRules } from "@/lib/mock-data";

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

function buildChiefOfStaffPrompt(): string {
  const ledgerSummary = priorityLedger
    .map((p) => `${p.rank}. ${p.title} (${p.context}, ${p.due})`)
    .join("\n");

  const openDecisions = decisions
    .filter((d) => d.status === "open")
    .map((d) => `- ${d.title} — deadline: ${d.deadline}`)
    .join("\n");

  const activeRules = automationRules
    .filter((r) => r.status === "active")
    .map((r) => `- ${r.name}: ${r.trigger} → ${r.action}`)
    .join("\n");

  return `You are Vyris, an AI Chief of Staff embedded in a premium executive productivity app.
Your tone is calm, precise, and direct — like a trusted senior aide, not a chatty assistant.
Keep responses concise (a few sentences to a short paragraph) unless asked for detail.

Current context for this user:

PRIORITY LEDGER (today):
${ledgerSummary}

OPEN DECISIONS:
${openDecisions}

ACTIVE AUTOMATION RULES:
${activeRules}

When relevant, reference this context naturally.`;
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
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "missing_api_key",
        message:
          "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local to enable real AI.",
      },
      { status: 500 }
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

  // ── Draft comms mode: single-turn, system prompt carries all context ──────
  if (mode === "draft_comms") {
    const draftNote = ctx.draftNote?.trim();
    if (!draftNote) {
      return NextResponse.json(
        { error: "missing_note", message: "Provide a rough note to draft from." },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: MAX_TOKENS,
        system: buildDraftCommsPrompt(ctx),
        messages: [{ role: "user", content: draftNote }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const draft = textBlock?.type === "text" ? textBlock.text : "";

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
      console.error("Anthropic draft_comms error:", err);
      return NextResponse.json(
        { error: "anthropic_api_error", message: "Vyris couldn't draft right now. Try again." },
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
  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: MAX_TOKENS,
      system: buildChiefOfStaffPrompt(),
      messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock?.type === "text" ? textBlock.text : "";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Anthropic chat error:", err);
    return NextResponse.json(
      { error: "anthropic_api_error", message: "Vyris couldn't respond right now. Try again." },
      { status: 502 }
    );
  }
}
