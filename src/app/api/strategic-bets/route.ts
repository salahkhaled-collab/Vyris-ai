import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  const bets = await prisma.strategicBet.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        ...(user?.teamId ? [{ teamId: user.teamId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bets);
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

  if (!body.title || !body.signal || !body.horizon) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const bet = await prisma.strategicBet.create({
    data: {
      title: body.title.trim(),
      signal: body.signal.trim(),
      horizon: body.horizon.trim(),
      status: body.status ?? "ON_TRACK",
      ownerId: session.user.id,
      teamId: body.shareWithTeam ? body.teamId ?? null : null,
    },
  });

  return NextResponse.json(bet, { status: 201 });
}
