import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { completeWithPythonLlm, pythonLlmConfigured } from "@/lib/ai/python-client";
import { getScope } from "@/lib/task-access";
import { scopeFilter } from "@/lib/ai/scope";
import { loadRiskSignals } from "@/lib/risk-signals-server";
import { formatDecisionEvidence } from "@/lib/decision-evidence";

// The recommendation calls the AI before saving.
export const maxDuration = 60;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  const decisions = await prisma.decision.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        ...(user?.teamId ? [{ teamId: user.teamId }] : []),
      ],
    },
    include: { options: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(decisions);
}

/** Facts from the user's own workspace, so the lean rests on real numbers. */
async function workspaceEvidence(userId: string): Promise<string> {
  try {
    const scope = await getScope(userId);
    const [signals, projects] = await Promise.all([
      loadRiskSignals(scope),
      prisma.project.findMany({
        where: { ...scopeFilter(scope), status: "ACTIVE" },
        select: { title: true, _count: { select: { tasks: { where: { status: { not: "DONE" } } } } } },
        take: 8,
      }),
    ]);
    return formatDecisionEvidence(
      signals,
      projects.map((p) => ({ title: p.title, openTasks: p._count.tasks }))
    );
  } catch (err) {
    console.error("Decision evidence failed:", err);
    return "";
  }
}

async function generateRecommendation(
  userId: string,
  title: string,
  context: string,
  options: { label: string; score: number; pros: string[]; cons: string[] }[]
): Promise<string | null> {
  if (!pythonLlmConfigured()) return null;

  const optionsText = options
    .map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o.label} (score: ${o.score})\nPros: ${o.pros.join(", ") || "none listed"}\nCons: ${o.cons.join(", ") || "none listed"}`)
    .join("\n\n");
  const evidence = await workspaceEvidence(userId);

  try {
    const response = await completeWithPythonLlm({
      maxTokens: 400,
      timeoutMs: 40_000,
      system:
        "You are Vyris, an AI Chief of Staff for founders. Given a decision, its options and facts from the user's own workspace, recommend one option in two or three sentences: which one, the single strongest reason, and the main trade-off. When a workspace fact bears on the choice (capacity, a blocked project, a goal behind pace, an open risk), cite it with its number. Don't invent facts that aren't given. No preamble and no 'it depends': founders need a clear lean.",
      messages: [{
        role: "user",
        content: `Decision: ${title}\nContext: ${context}\n\n${optionsText}\n\nWorkspace facts:\n${evidence || "(none available)"}`,
      }],
    });

    return response.text.trim() || null;
  } catch (err) {
    console.error("AI recommendation error:", err);
    return null;
  }
}

/** The signed-in user's own team, or null. Used instead of any client-supplied teamId. */
async function callerTeamId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
  return user?.teamId ?? null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (
    typeof body?.title !== "string" ||
    !body.title.trim() ||
    typeof body.context !== "string" ||
    !Array.isArray(body.options) ||
    body.options.length > 10
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const strList = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 200)).filter(Boolean).slice(0, 10) : [];
  const options: { label: string; score: number; pros: string[]; cons: string[] }[] = [];
  for (const raw of body.options as unknown[]) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim().slice(0, 200) : "";
    const score = Number(o.score);
    if (!label || !Number.isFinite(score)) {
      return NextResponse.json({ error: "invalid_option", message: "Each option needs a name and a score." }, { status: 400 });
    }
    options.push({ label, score: Math.min(Math.max(Math.round(score), 0), 100), pros: strList(o.pros), cons: strList(o.cons) });
  }

  const recommendation = await generateRecommendation(session.user.id, body.title.trim(), body.context.trim(), options);

  const decision = await prisma.decision.create({
    data: {
      title: body.title.trim().slice(0, 300),
      context: body.context.trim().slice(0, 4000),
      deadline: typeof body.deadline === "string" ? body.deadline.slice(0, 40) : "",
      recommendation,
      ownerId: session.user.id,
      // Never trust a teamId from the client: share only into the caller's own team.
      teamId: body.shareWithTeam ? await callerTeamId(session.user.id) : null,
      options: { create: options },
    },
    include: { options: true },
  });

  return NextResponse.json(decision, { status: 201 });
}