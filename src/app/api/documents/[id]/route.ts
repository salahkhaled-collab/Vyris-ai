import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

async function canAccess(userId: string, docId: string) {
  // Access check reads metadata only; the file bytes are loaded for downloads.
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { id: true, ownerId: true, teamId: true, filename: true, mimeType: true, sizeBytes: true },
  });
  if (!doc) return { doc: null, allowed: false };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
  const allowed = doc.ownerId === userId || (doc.teamId && doc.teamId === user?.teamId);
  return { doc, allowed };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { doc, allowed } = await canAccess(session.user.id, params.id);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const file = await prisma.document.findUnique({ where: { id: doc.id }, select: { data: true } });
  if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // ASCII fallback name plus the exact UTF-8 name (RFC 5987); quotes and
  // line breaks can't break out of the header.
  const asciiName = doc.filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "Content-Length": String(doc.sizeBytes),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { doc, allowed } = await canAccess(session.user.id, params.id);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (doc.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
