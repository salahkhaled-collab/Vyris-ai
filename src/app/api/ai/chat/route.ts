import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { priorityLedger, decisions, automationRules } from "@/lib/mock-data";

const MAX_HISTORY_MESSAGES = 10;
const MAX_TOKENS = 600;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(): string {
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

Current context for this user (mock data — treat as real for this session):

PRIORITY LEDGER (today):
${ledgerSummary}

OPEN DECISIONS:
${openDecisions}

ACTIVE AUTOMATION RULES:
${activeRules}

When relevant, reference this context naturally. Do not mention that this is mock data.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "missing_api_key",
        message:
          "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local to enable real AI chat.",
      },
      { status: 500 }
    );
  }

  let body: { messages?: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Request body must be JSON." },
      { status: 400 }
    );
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json(
      { error: "empty_messages", message: "No messages provided." },
      { status: 400 }
    );
  }

  // Cap history to keep token usage predictable
  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(),
      messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock?.type === "text" ? textBlock.text : "";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Anthropic API error:", err);
    return NextResponse.json(
      { error: "anthropic_api_error", message: "Vyris couldn't respond right now. Try again." },
      { status: 502 }
    );
  }
}
