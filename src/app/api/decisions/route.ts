import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

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

async function generateRecommendation(
  title: string,
  context: string,
  options: { label: string; score: number; pros: string[]; cons: string[] }[]
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const optionsText = options
    .map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o.label} (score: ${o.score})\nPros: ${o.pros.join(", ") || "none listed"}\nCons: ${o.cons.join(", ") || "none listed"}`)
    .join("\n\n");

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 200,
      system: "You are Vyris, an AI Chief of Staff for solo business operators. Given a decision and its options, give a direct, one-to-two sentence recommendation. State which option you'd lean toward and the single strongest reason why. No preamble, no hedging language like 'it depends' — operators need a clear lean, not a menu of considerations they already have.",
      messages: [{
        role: "user",
        content: `Decision: ${title}\nContext: ${context}\n\n${optionsText}`,
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.type === "text" ? textBlock.text.trim() : null;
  } catch (err) {
    console.error("AI recommendation error:", err);
    return null;
  }
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

  if (!body.title || !body.context || !Array.isArray(body.options)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const recommendation = await generateRecommendation(body.title, body.context, body.options);

  const decision = await prisma.decision.create({
    data: {
      title: body.title.trim(),
      context: body.context.trim(),
      deadline: body.deadline ?? "",
      recommendation,
      ownerId: session.user.id,
      teamId: body.shareWithTeam ? body.teamId ?? null : null,
      options: {
        create: body.options.map((o: any) => ({
          label: o.label,
          score: o.score,
          pros: o.pros ?? [],
          cons: o.cons ?? [],
        })),
      },
    },
    include: { options: true },
  });

  return NextResponse.json(decision, { status: 201 });
}