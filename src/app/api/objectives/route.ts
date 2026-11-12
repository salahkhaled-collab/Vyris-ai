import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { computeProgress } from "@/lib/okr";

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
    typeof body.quarter !== "string" ||
    !body.quarter.trim() ||
    !Array.isArray(body.keyResults) ||
    body.keyResults.length > 20
  ) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const keyResults: { label: string; current: number; target: number; unit: string }[] = [];
  for (const kr of body.keyResults as unknown[]) {
    const k = (kr ?? {}) as Record<string, unknown>;
    const label = typeof k.label === "string" ? k.label.trim().slice(0, 200) : "";
    const target = Number(k.target);
    const current = k.current === undefined || k.current === "" ? 0 : Number(k.current);
    if (!label || !Number.isFinite(target) || target <= 0 || !Number.isFinite(current)) {
      return NextResponse.json(
        { error: "invalid_key_result", message: "Each key result needs a name and a target above 0." },
        { status: 400 }
      );
    }
    keyResults.push({ label, current, target, unit: typeof k.unit === "string" ? k.unit.slice(0, 20) : "" });
  }

  const objective = await prisma.objective.create({
    data: {
      title: body.title.trim().slice(0, 300),
      quarter: body.quarter.trim().slice(0, 20),
      ownerId: session.user.id,
      // Never trust a teamId from the client: share only into the caller's own team.
      teamId: body.shareWithTeam ? await callerTeamId(session.user.id) : null,
      keyResults: {
        create: keyResults,
      },
    },
    include: { keyResults: true },
  });

  return NextResponse.json(
    { ...objective, progress: computeProgress(objective.keyResults) },
    { status: 201 }
  );
}