import { NextRequest, NextResponse } from "next/server";
import { rateLimitWait } from "@/lib/inbox-ai";
import { assistantBusyMessage } from "@/lib/ai/assistant";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { pythonLlmConfigured } from "@/lib/ai/python-client";
import {
  MAX_HISTORY_MESSAGES,
  runAssistantTurn,
  type AssistantTurnResult,
  sanitizeHistory,
  type ChatMessage,
} from "@/lib/ai/assistant";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!pythonLlmConfigured()) {
    return NextResponse.json(
      { error: "missing_llm_url", message: "The AI is temporarily unavailable." },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const message: unknown = body?.message;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }
  const text = message.trim();
  const page = typeof body?.page === "string" ? body.page.slice(0, 40) : null;

  // History: from the DB when continuing a saved conversation (never trust the client's copy).
  let convoId: string | null = typeof body?.conversationId === "string" ? body.conversationId : null;
  let history: ChatMessage[] = [];
  if (convoId) {
    const convo = await prisma.aiConversation.findFirst({
      where: { id: convoId, ownerId: userId },
      select: { id: true },
    });
    if (!convo) {
      return NextResponse.json({ error: "not_found", message: "Conversation not found." }, { status: 404 });
    }
    const rows = await prisma.aiMessage.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "desc" },
      take: MAX_HISTORY_MESSAGES,
      select: { role: true, content: true },
    });
    history = rows.reverse() as ChatMessage[];
  } else {
    history = sanitizeHistory(body?.history);
  }

  async function finish({ reply, pendingActions }: AssistantTurnResult) {
    try {
      if (!convoId) {
        const created = await prisma.aiConversation.create({
          data: { ownerId: userId, title: text.slice(0, 40) },
          select: { id: true },
        });
        convoId = created.id;
      }
      await prisma.aiMessage.createMany({
        data: [
          { conversationId: convoId, role: "user", content: text },
          { conversationId: convoId, role: "assistant", content: reply },
        ],
      });
      await prisma.aiConversation.update({ where: { id: convoId }, data: { updatedAt: new Date() } });
    } catch (err) {
      console.error("Saving AI history failed:", err); // never lose the reply because of this
    }
    return NextResponse.json({ reply, pendingActions, conversationId: convoId });
  }

  try {
    return finish(await runAssistantTurn({ userId, text, history, page }));
  } catch (err) {
    const wait = rateLimitWait(err);
    if (wait !== null) {
      return NextResponse.json(
        { error: "rate_limited", message: assistantBusyMessage(wait), retryAfter: wait },
        { status: 429 }
      );
    }
    console.error("Python LLM query error:", err);
    return NextResponse.json(
      { error: "python_llm_error", message: "Vyris couldn't respond right now. Try again." },
      { status: 502 }
    );
  }
}