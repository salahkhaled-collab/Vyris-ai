import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { NewDecisionForm } from "@/components/decisions/NewDecisionForm";

async function canAccessDecision(userId: string, decisionId: string) {
  const decision = await prisma.decision.findUnique({
    where: { id: decisionId },
    include: { options: true },
  });
  if (!decision) return { decision: null, allowed: false };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
  const allowed =
    decision.ownerId === userId ||
    (decision.teamId && decision.teamId === user?.teamId);

  return { decision, allowed };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { decision, allowed } = await canAccessDecision(session.user.id, params.id);
  if (!decision) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { chosenOptionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.chosenOptionId) {
    return NextResponse.json({ error: "missing_chosenOptionId" }, { status: 400 });
  }

  if (!decision.options.some((o) => o.id === body.chosenOptionId)) {
    return NextResponse.json({ error: "invalid_option" }, { status: 400 });
  }

  const updated = await prisma.decision.update({
    where: { id: params.id },
    data: { status: "DECIDED", chosenOptionId: body.chosenOptionId },
    include: { options: true },
  });

  return NextResponse.json(updated);
}
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { decision, allowed } = await canAccessDecision(session.user.id, params.id);
  if (!decision) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.decision.delete({ where: { id: params.id } });

  return NextResponse.json({ deleted: true });
}