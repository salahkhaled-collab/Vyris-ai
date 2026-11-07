import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";

const VALID_STATUSES: ProjectStatus[] = ["ACTIVE", "PAUSED", "DONE"];

interface PatchBody {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  /** true shares with the owner's own team; false makes it private again. */
  shareWithTeam?: boolean;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  // Sharing: only the owner gets here (checked above). The team always comes from
  // the owner's account, never from the request body.
  let teamId: string | null | undefined;
  if (typeof body.shareWithTeam === "boolean") {
    if (body.shareWithTeam) {
      const owner = await prisma.user.findUnique({ where: { id: session.user.id }, select: { teamId: true } });
      if (!owner?.teamId) {
        return NextResponse.json(
          { error: "no_team", message: "Enable a Team workspace before sharing." },
          { status: 400 }
        );
      }
      teamId = owner.teamId;
    } else {
      teamId = null;
    }
  }

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.description !== undefined && { description: body.description.trim() || null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(teamId !== undefined && { teamId }),
    },
    include: { tasks: true, owner: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
