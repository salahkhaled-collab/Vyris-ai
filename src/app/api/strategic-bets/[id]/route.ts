import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

async function canAccessBet(userId: string, betId: string) {
  const bet = await prisma.strategicBet.findUnique({ where: { id: betId } });
  if (!bet) return { bet: null, allowed: false };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
  const allowed = bet.ownerId === userId || (bet.teamId && bet.teamId === user?.teamId);

  return { bet, allowed };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { bet, allowed } = await canAccessBet(session.user.id, params.id);
  if (!bet) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const validStatuses = ["ON_TRACK", "AT_RISK", "OFF_TRACK"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const updated = await prisma.strategicBet.update({
    where: { id: params.id },
    data: { status: body.status as any },
  });

  return NextResponse.json(updated);
}