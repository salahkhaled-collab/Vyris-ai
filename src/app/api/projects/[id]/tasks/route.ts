import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

interface CreateTaskBody {
  title: string;
  dueDate?: string;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Allow adding tasks if you own the project OR it's shared with your team.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });
  const canAccess = project.ownerId === session.user.id || (project.teamId && project.teamId === user?.teamId);
  if (!canAccess) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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

  const task = await prisma.task.create({
    data: {
      title: body.title.trim(),
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      projectId: params.id,
      ownerId: session.user.id,
    },
  });

  return NextResponse.json(task);
}
