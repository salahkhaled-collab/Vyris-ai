// src/lib/ai/assistant.ts
//
// The one Vyris assistant. Every chat surface (the Ask Vyris widget and the
// AI & Automation page) runs a turn through runAssistantTurn, so they share the
// same system prompt, workspace context, saved notes and tools. Before this,
// the widget had its own prompt and no tools, so it could only summarise counts.
//
// Server-only. Throws if the model call fails; callers turn that into a 502.

import { completeWithPythonLlm, type PythonMessage } from "@/lib/ai/python-client";
import { VYRIS_TOOLS, runTool, type VyrisToolName } from "@/lib/ai/tools";
import { VYRIS_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { buildSystemPromptWithContext } from "@/lib/ai/context";
import { getScope } from "@/lib/task-access";
import { AWAITING_APPROVAL, describeAction, isWriteTool, type PendingAction } from "@/lib/ai/actions";

export const MAX_HISTORY_MESSAGES = 10;
const MAX_TOOL_ROUNDS = 5;
const MAX_TOKENS = 1200;
const MAX_TOOL_RESULT_CHARS = 12_000;
/**
 * Whole-turn budget: the chat routes allow 60s. Tools (which can send email)
 * run between model calls, so leave a wide margin to finish, save and respond.
 */
export const TURN_BUDGET_MS = 40_000;
/** Don't start another model call with less time than this left. */
const MIN_CALL_MS = 8_000;
const KNOWN_TOOLS = new Set<string>(VYRIS_TOOLS.map((t) => t.name));

export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface AssistantTurnInput {
  userId: string;
  /** The user's new message. */
  text: string;
  /** Earlier messages, oldest first; trimmed to MAX_HISTORY_MESSAGES. */
  history: ChatMessage[];
  /** Route-like page name for context, e.g. "projects". */
  page?: string | null;
}

/** Keep only well-formed user/assistant messages, newest MAX_HISTORY_MESSAGES. */
export function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string"
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content }));
}

export interface AssistantTurnResult {
  reply: string;
  /** Changes the assistant proposed; none has run. The user approves each one. */
  pendingActions: PendingAction[];
}

const MAX_PENDING_ACTIONS = 5;

export async function runAssistantTurn(input: AssistantTurnInput): Promise<AssistantTurnResult> {
  const pendingActions: PendingAction[] = [];
  const done = (reply: string): AssistantTurnResult => ({ reply, pendingActions });
  const deadline = Date.now() + TURN_BUDGET_MS;
  const scope = await getScope(input.userId);
  const system = await buildSystemPromptWithContext(VYRIS_SYSTEM_PROMPT, {
    userId: input.userId,
    page: input.page ?? null,
  });
  const messages: PythonMessage[] = [
    ...input.history.slice(-MAX_HISTORY_MESSAGES),
    { role: "user", content: input.text },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const left = deadline - Date.now();
    if (left < MIN_CALL_MS) {
      return done("That took longer than I can spend on one reply. Ask again to continue.");
    }
    const completion = await completeWithPythonLlm({
      system,
      messages,
      tools: VYRIS_TOOLS,
      maxTokens: MAX_TOKENS,
      timeoutMs: left,
    });

    if (completion.toolCalls.length === 0) return done(completion.text);

    messages.push(completion.assistantMessage);
    for (const call of completion.toolCalls) {
      // Out of time: don't start more tools; say so instead of being cut off.
      if (deadline - Date.now() < MIN_CALL_MS) {
        return done("That took longer than I can spend on one reply. Ask again to continue.");
      }
      let content: string;
      try {
        if (!KNOWN_TOOLS.has(call.name)) throw new Error(`Unknown tool: ${call.name}`);
        if (isWriteTool(call.name)) {
          // Never run a change here: propose it, and the user approves it.
          if (pendingActions.length >= MAX_PENDING_ACTIONS) {
            content = JSON.stringify({ ok: false, error: "Too many proposed changes in one reply. Propose fewer." });
          } else {
            pendingActions.push({
              id: call.id,
              tool: call.name,
              input: call.input,
              summary: await describeAction(call.name, call.input, scope),
            });
            content = JSON.stringify(AWAITING_APPROVAL);
          }
          if (content.length > MAX_TOOL_RESULT_CHARS) content = content.slice(0, MAX_TOOL_RESULT_CHARS);
          messages.push({ role: "tool", tool_call_id: call.id, content });
          continue;
        }
        const result = await runTool(call.name as VyrisToolName, call.input, scope);
        content = JSON.stringify(result);
      } catch (err: unknown) {
        content = JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
      if (content.length > MAX_TOOL_RESULT_CHARS) {
        content = content.slice(0, MAX_TOOL_RESULT_CHARS) + "…[truncated]";
      }
      messages.push({ role: "tool", tool_call_id: call.id, content });
    }
  }

  return done("I gathered some information but hit my tool-call limit before finishing. Try narrowing the question.");
}

/**
 * Shown when the AI provider's per-minute limit is hit. Says plainly that
 * earlier steps may already be saved, so a retry doesn't create duplicates.
 */
export function assistantBusyMessage(seconds: number): string {
  return `Vyris is busy right now (free AI plan limit). Wait about ${seconds} seconds and ask again.`;
}
