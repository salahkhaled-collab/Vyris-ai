import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/ai/scope";
import { getScope, isValidAssignee } from "@/lib/task-access";

interface CreateTaskBody {
  title: string;
  dueDate?: string;
  assigneeId?: string | null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Allow adding tasks if you own the project OR it's shared with your team.
  const scope = await getScope(session.user.id);
  const project = await prisma.project.findFirst({
    where: { id: params.id, ...scopeFilter(scope) },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: CreateTaskBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "missing_title" }, { status: 400 });
  }

  // Omitted/null assignee means "the owner", which is what every solo user gets.
  if (body.assigneeId && !(await isValidAssignee(scope, body.assigneeId))) {
    return NextResponse.json({ error: "invalid_assignee" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title: body.title.trim(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      projectId: params.id,
      ownerId: session.user.id,
      assigneeId: body.assigneeId || null,
    },
  });

  return NextResponse.json(task);
}
