import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  // Visible projects: ones you own, plus team projects if you're on a team.
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        ...(user?.teamId ? [{ teamId: user.teamId }] : []),
      ],
    },
    include: {
      tasks: { orderBy: { createdAt: "asc" } },
      owner: { select: { id: true, name: true, image: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects });
}

interface CreateProjectBody {
  title: string;
  description?: string;
  shareWithTeam?: boolean;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: CreateProjectBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "missing_title" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  const project = await prisma.project.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      ownerId: session.user.id,
      teamId: body.shareWithTeam && user?.teamId ? user.teamId : null,
      status: "ACTIVE" as ProjectStatus,
    },
    include: { tasks: true, owner: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(project);
}
