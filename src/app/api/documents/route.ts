import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/ai/scope";
import { getScope } from "@/lib/task-access";

// Keeping this conservative since files are stored as bytes directly
//8MB
const MAX_FILE_BYTES = 8 * 1024 * 1024;  


export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        ...(user?.teamId ? [{ teamId: user.teamId }] : []),
      ],
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      projectId: true,
      teamId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "invalid_body", message: "Upload a file." }, { status: 400 });
  }
  const file = formData.get("file");
  const projectId = formData.get("projectId")?.toString() || null;
  const shareWithTeam = formData.get("shareWithTeam") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  // A document may only be attached to a project the caller can see.
  if (projectId) {
    const scope = await getScope(session.user.id);
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...scopeFilter(scope) },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "project_not_found", message: "That project wasn't found." }, { status: 404 });
    }
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", message: "Files must be under 8MB." },
      { status: 413 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  const buffer = Buffer.from(await file.arrayBuffer());

  const doc = await prisma.document.create({
    data: {
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      data: buffer,
      ownerId: session.user.id,
      projectId: projectId || null,
      teamId: shareWithTeam && user?.teamId ? user.teamId : null,
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      projectId: true,
      teamId: true,
    },
  });

  return NextResponse.json(doc);
}
