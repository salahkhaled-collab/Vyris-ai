// app/api/ai/query/route.ts
//
// POST { message: string, history?: {role: "user"|"assistant", content: string}[] }
// -> { reply: string }
//
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { VYRIS_TOOLS, runTool, type VyrisToolName } from "@/lib/ai/tools";
import { VYRIS_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import type { Scope } from "@/lib/ai/scope";
import { completeWithPythonLlm, type PythonMessage } from "@/lib/ai/python-client";

const MAX_TOOL_ROUNDS = 6; // hard cap so a confused loop can't run away

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const message: string | undefined = body?.message;
  const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  // Look up teamId server-side — never trust it from the client.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  const scope: Scope = { userId: session.user.id, teamId: user?.teamId ?? null };

  const messages: PythonMessage[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  let finalText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await completeWithPythonLlm({
      maxTokens: 1500,
      system: VYRIS_SYSTEM_PROMPT,
      tools: VYRIS_TOOLS,
      messages,
    });

    const toolUseBlocks = response.toolCalls;

    // No tool calls this round — Claude gave a final answer.
    if (toolUseBlocks.length === 0) {
      finalText = response.text;
      break;
    }

    // Record the assistant turn (including tool_use blocks) before
    // appending results, per the Messages API's tool-use contract.
    messages.push({ role: "assistant", content: response.assistantContent });

    const toolResults: Record<string, unknown>[] = [];
    for (const block of toolUseBlocks) {
      try {
        const result = await runTool(
          block.name as VyrisToolName,
          block.input as Record<string, unknown>,
          scope
        );
        toolResults.push({ tool_call_id: block.id, content: JSON.stringify(result) });
      } catch (err) {
        toolResults.push({ tool_call_id: block.id, content: `Error running tool: ${err instanceof Error ? err.message : String(err)}`, is_error: true });
      }
    }

    messages.push({ role: "tool", content: toolResults });

    if (round === MAX_TOOL_ROUNDS - 1) {
      finalText =
        "I gathered some information but hit my tool-call limit before finishing. Try narrowing the question.";
    }
  }

  return NextResponse.json({ reply: finalText });
}