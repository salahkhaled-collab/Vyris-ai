import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getScope } from "@/lib/task-access";
import { runTool } from "@/lib/ai/tools";
import { isWriteTool, normalizeActionInput } from "@/lib/ai/actions";
import { consume, MINUTE } from "@/lib/rate-limit";

// Some actions (task status) can run automation rules that send email.
export const maxDuration = 30;

/**
 * POST /api/ai/actions { tool, input }: run a change the assistant proposed,
 * after the user clicked Approve. It runs as the signed-in user through the
 * same tool code, so every access check applies; only write tools are allowed.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { tool?: unknown; input?: unknown } | null;
  const tool = typeof body?.tool === "string" ? body.tool : "";
  const input = body?.input && typeof body.input === "object" && !Array.isArray(body.input) ? (body.input as Record<string, unknown>) : null;
  if (!isWriteTool(tool) || !input) {
    return NextResponse.json({ error: "invalid_action", message: "That action can't be run." }, { status: 400 });
  }
  if (!(await consume(`ai-action:${session.user.id}`, 60, MINUTE))) {
    return NextResponse.json({ error: "rate_limited", message: "Too many actions at once. Wait a minute." }, { status: 429 });
  }

  // The same normalisation the proposal went through: what was shown is what runs.
  const normalized = normalizeActionInput(tool, input);
  if (!normalized.ok) {
    return NextResponse.json({ error: "invalid_action", message: normalized.error }, { status: 400 });
  }

  try {
    const scope = await getScope(session.user.id);
    const result = (await runTool(tool, normalized.input, scope)) as { ok?: boolean; error?: string } | null;
    if (result && result.ok === false) {
      return NextResponse.json({ error: "action_failed", message: result.error ?? "That didn't work.", result }, { status: 422 });
    }
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("AI action failed:", err);
    return NextResponse.json({ error: "action_failed", message: "That didn't work. Try again." }, { status: 500 });
  }
}
