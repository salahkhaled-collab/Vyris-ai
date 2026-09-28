// src/app/api/ai/query/route.ts
//
// POST { message: string, history?: {role: "user"|"assistant", content: string}[] }
// -> { reply: string }
//
// Tool-using Vyris Intelligence endpoint, powered by Vyris's own LLM
// (src/lib/ai/python-client.ts). No Anthropic / OpenAI SDK.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  completeWithPythonLlm,
  pythonLlmConfigured,
  type PythonMessage,
} from "@/lib/ai/python-client";
import { VYRIS_TOOLS, runTool, type VyrisToolName } from "@/lib/ai/tools";
import { VYRIS_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import type { Scope } from "@/lib/ai/scope";

// Tool loops make several model calls in one request. Raise the function
// time limit so Vercel doesn't cut it off mid-loop (plan limits still apply).
export const maxDuration = 60;

const MAX_TOOL_ROUNDS = 5; // hard cap so a confused model can't loop forever
const MAX_HISTORY_MESSAGES = 10;
const MAX_TOKENS = 1200;
const MAX_TOOL_RESULT_CHARS = 12_000; // keep tool output inside the model's context

const KNOWN_TOOLS = new Set<string>(VYRIS_TOOLS.map((t) => t.name));

type ChatMessage = { role: "user" | "assistant"; content: string };

// History comes from the client, so treat it as untrusted: only plain
// user/assistant text is accepted (a client-supplied "system" role is dropped).
function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content }));
}

export async function POST(req: NextRequest) {
  if (!pythonLlmConfigured()) {
    return NextResponse.json(
      { error: "missing_llm_url", message: "PYTHON_LLM_URL is not set on the server." },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const message: unknown = body?.message;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  // teamId is read server-side — never trusted from the client.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });
  const scope: Scope = { userId: session.user.id, teamId: user?.teamId ?? null };

  const messages: PythonMessage[] = [
    ...sanitizeHistory(body?.history),
    { role: "user", content: message.trim() },
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await completeWithPythonLlm({
        system: VYRIS_SYSTEM_PROMPT,
        messages,
        tools: VYRIS_TOOLS,
        maxTokens: MAX_TOKENS,
      });

      // No tool calls: the model gave its final answer.
      if (completion.toolCalls.length === 0) {
        return NextResponse.json({ reply: completion.text });
      }

      // Record the assistant turn (with its tool_calls), then answer each call.
      messages.push(completion.assistantMessage);

      for (const call of completion.toolCalls) {
        let content: string;
        try {
          if (!KNOWN_TOOLS.has(call.name)) throw new Error(`Unknown tool: ${call.name}`);
          const result = await runTool(call.name as VyrisToolName, call.input, scope);
          content = JSON.stringify(result);
        } catch (err) {
          content = `Error running tool: ${err instanceof Error ? err.message : String(err)}`;
        }
        if (content.length > MAX_TOOL_RESULT_CHARS) {
          content = content.slice(0, MAX_TOOL_RESULT_CHARS) + "…[truncated]";
        }
        messages.push({ role: "tool", tool_call_id: call.id, content });
      }
    }

    return NextResponse.json({
      reply:
        "I gathered some information but hit my tool-call limit before finishing. Try narrowing the question.",
    });
  } catch (err) {
    console.error("Python LLM query error:", err);
    return NextResponse.json(
      { error: "python_llm_error", message: "Vyris couldn't respond right now. Try again." },
      { status: 502 }
    );
  }
}
