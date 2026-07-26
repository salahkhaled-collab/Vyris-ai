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

  const objectives = await prisma.objective.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        ...(user?.teamId ? [{ teamId: user.teamId }] : []),
      ],
    },
    include: { keyResults: true },
    orderBy: { createdAt: "desc" },
  });

  // progress is derived, never stored — computed fresh on every read
  const withProgress = objectives.map((o) => ({
    ...o,
    progress: computeProgress(o.keyResults),
  }));

  return NextResponse.json(withProgress);
}

function computeProgress(keyResults: { current: number; target: number }[]) {
  if (keyResults.length === 0) return 0;
  const pcts = keyResults.map((kr) => Math.min(kr.target === 0 ? 0 : kr.current / kr.target, 1));
  const avg = pcts.reduce((sum, p) => sum + p, 0) / pcts.length;
  return Math.round(avg * 100);
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

  if (!body.title || !body.quarter || !Array.isArray(body.keyResults)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const objective = await prisma.objective.create({
    data: {
      title: body.title.trim(),
      quarter: body.quarter.trim(),
      ownerId: session.user.id,
      teamId: body.shareWithTeam ? body.teamId ?? null : null,
      keyResults: {
        create: body.keyResults.map((kr: any) => ({
          label: kr.label,
          current: Number(kr.current) || 0,
          target: Number(kr.target),
          unit: kr.unit ?? "",
        })),
      },
    },
    include: { keyResults: true },
  });

  return NextResponse.json(
    { ...objective, progress: computeProgress(objective.keyResults) },
    { status: 201 }
  );
}