import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

async function canAccessKeyResult(userId: string, keyResultId: string) {
  const kr = await prisma.keyResult.findUnique({
    where: { id: keyResultId },
    include: { objective: true },
  });
  if (!kr) return { kr: null, allowed: false };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
  const allowed =
    kr.objective.ownerId === userId ||
    (kr.objective.teamId && kr.objective.teamId === user?.teamId);

  return { kr, allowed };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { kr, allowed } = await canAccessKeyResult(session.user.id, params.id);
  if (!kr) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { current?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof body.current !== "number") {
    return NextResponse.json({ error: "invalid_current" }, { status: 400 });
  }

  const updated = await prisma.keyResult.update({
    where: { id: params.id },
    data: { current: body.current },
  });

  return NextResponse.json(updated);
}
