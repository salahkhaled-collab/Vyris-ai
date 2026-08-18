import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

async function canAccessObjective(userId: string, objectiveId: string) {
  const objective = await prisma.objective.findUnique({ where: { id: objectiveId } });
  if (!objective) return { objective: null, allowed: false };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
  const allowed = objective.ownerId === userId || (objective.teamId && objective.teamId === user?.teamId);

  return { objective, allowed };
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { objective, allowed } = await canAccessObjective(session.user.id, params.id);
  if (!objective) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.objective.delete({ where: { id: params.id } });

  return NextResponse.json({ deleted: true });
}