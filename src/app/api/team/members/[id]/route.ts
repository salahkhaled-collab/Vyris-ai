import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { canChangeLevel, canRemove, type Level, type Person } from "@/lib/team-rules";

/** The caller, the target and everyone on the caller's team, or null if they aren't on the same team. */
async function load(callerId: string, targetId: string) {
  const caller = await prisma.user.findUnique({ where: { id: callerId }, select: { id: true, teamId: true, accessLevel: true } });
  if (!caller?.teamId) return null;
  const team = await prisma.user.findMany({
    where: { teamId: caller.teamId },
    select: { id: true, accessLevel: true },
  });
  const target = team.find((p) => p.id === targetId);
  if (!target) return null;
  const asPerson = (p: { id: string; accessLevel: Level | null }): Person => ({ id: p.id, accessLevel: p.accessLevel ?? "MEMBER" });
  return { teamId: caller.teamId, actor: asPerson(caller), target: asPerson(target), team: team.map(asPerson) };
}

/** PATCH { accessLevel }: an admin changes a teammate's access. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { accessLevel?: unknown } | null;
  const next = body?.accessLevel;
  if (next !== "ADMIN" && next !== "MEMBER") {
    return NextResponse.json({ error: "invalid_access_level", message: "Choose Admin or Member." }, { status: 400 });
  }
  const ctx = await load(session.user.id, params.id);
  if (!ctx) return NextResponse.json({ error: "not_found", message: "That person isn't on your team." }, { status: 404 });
  const verdict = canChangeLevel(ctx.actor, ctx.target, next, ctx.team);
  if (!verdict.ok) return NextResponse.json({ error: "not_allowed", message: verdict.message }, { status: verdict.status });

  await prisma.user.update({ where: { id: params.id }, data: { accessLevel: next } });
  return NextResponse.json({ ok: true, accessLevel: next });
}

/**
 * DELETE: an admin removes a teammate, or anyone leaves (their own id).
 * The person goes back to a personal workspace. Records they shared stay
 * with the team; tasks they were assigned in other people's work are
 * unassigned so they don't sit with someone who can no longer see them.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const ctx = await load(session.user.id, params.id);
  if (!ctx) return NextResponse.json({ error: "not_found", message: "That person isn't on your team." }, { status: 404 });
  const verdict = canRemove(ctx.actor, ctx.target, ctx.team);
  if (!verdict.ok) return NextResponse.json({ error: "not_allowed", message: verdict.message }, { status: verdict.status });

  await prisma.$transaction([
    prisma.task.updateMany({
      where: { assigneeId: params.id, ownerId: { not: params.id }, project: { teamId: ctx.teamId } },
      data: { assigneeId: null },
    }),
    prisma.user.update({
      where: { id: params.id },
      data: { teamId: null, workspaceType: "PERSONAL", accessLevel: "ADMIN" },
    }),
  ]);
  return NextResponse.json({ ok: true, left: params.id === session.user.id });
}
