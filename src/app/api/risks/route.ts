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

  const risks = await prisma.risk.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        ...(user?.teamId ? [{ teamId: user.teamId }] : []),
      ],
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ risks });
}

const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

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

  if (!body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
    return NextResponse.json({ error: "invalid_severity" }, { status: 400 });
  }

  let teamId: string | null = null;
  if (body.shareWithTeam) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { teamId: true },
    });
    teamId = user?.teamId ?? null;
  }

  const risk = await prisma.risk.create({
    data: {
      title: body.title.trim(),
      description: body.description.trim(),
      severity: body.severity ?? "MEDIUM",
      status: "OPEN",
      ownerId: session.user.id,
      teamId,
    },
  });

  return NextResponse.json(risk, { status: 201 });
}
