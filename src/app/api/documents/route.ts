import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// Keeping this conservative since files are stored as bytes directly
// in Postgres (see schema note) — fine for documents/PDFs, not for
// video or large media. Move to S3/R2/Vercel Blob before raising this.
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

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
      // deliberately omit `data` — list view shouldn't pull file bytes
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

  const formData = await req.formData();
  const file = formData.get("file");
  const projectId = formData.get("projectId")?.toString() || null;
  const shareWithTeam = formData.get("shareWithTeam") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
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
