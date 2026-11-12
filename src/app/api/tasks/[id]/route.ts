import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { afterTaskStatusChange } from "@/lib/automation/engine";
import { parseTaskPatch } from "@/lib/task-input";
import {
  getScope,
  isValidAssignee,
  taskAccessWhere,
  taskManageWhere,
} from "@/lib/task-access";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const scope = await getScope(session.user.id);
  const task = await prisma.task.findFirst({
    where: { id: params.id, ...taskAccessWhere(scope) },
  });
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = parseTaskPatch(await req.json().catch(() => null));
  if ("error" in body) {
    return NextResponse.json(body, { status: 400 });
  }

  // Reassigning needs manage rights (owner, or the project is in your scope): being
  // the assignee lets you work the task, not hand it to someone else. Same rule as
  // the AI's assign_task tool.
  if (body.assigneeId !== undefined) {
    const canManage = await prisma.task.findFirst({
      where: { id: params.id, ...taskManageWhere(scope) },
      select: { id: true },
    });
    if (!canManage) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // null clears the assignment (back to "the owner"); a string must be a valid assignee.
  if (typeof body.assigneeId === "string" && !(await isValidAssignee(scope, body.assigneeId))) {
    return NextResponse.json({ error: "invalid_assignee" }, { status: 400 });
  }

  // blockedReason only lives while the task is BLOCKED; leaving BLOCKED clears it.
  const effectiveStatus = body.status ?? task.status;
  let blockedReason: string | null | undefined;
  if (effectiveStatus !== "BLOCKED") {
    blockedReason = task.blockedReason ? null : undefined;
  } else if (body.blockedReason !== undefined) {
    blockedReason = body.blockedReason;
  }

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
      ...(blockedReason !== undefined && { blockedReason }),
    },
  });

  // Automation rules (task blocked / done). Never throws; failures are logged on the rule.
  await afterTaskStatusChange(updated.id, task.status, updated.status);

  return NextResponse.json(updated);
}

// Status changes can run automation rules that send email.
export const maxDuration = 30;

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Being assigned a task lets you work on it, not delete it.
  const scope = await getScope(session.user.id);
  const task = await prisma.task.findFirst({
    where: { id: params.id, ...taskManageWhere(scope) },
    select: { id: true },
  });
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
