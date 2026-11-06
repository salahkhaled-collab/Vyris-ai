import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@prisma/client";
import {
  getScope,
  isValidAssignee,
  taskAccessWhere,
  taskManageWhere,
} from "@/lib/task-access";

const VALID_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

interface PatchBody {
  title?: string;
  status?: TaskStatus;
  dueDate?: string | null;
  assigneeId?: string | null;
  blockedReason?: string | null;
}

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

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
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
    blockedReason = body.blockedReason?.trim() || null;
  }

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.dueDate !== undefined && {
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
      ...(blockedReason !== undefined && { blockedReason }),
    },
  });

  return NextResponse.json(updated);
}

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
