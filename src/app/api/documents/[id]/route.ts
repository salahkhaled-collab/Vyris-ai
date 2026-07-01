import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

async function canAccess(userId: string, docId: string) {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
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

  return new NextResponse(new Uint8Array(doc.data), {
  headers: {
    "Content-Type": doc.mimeType,
    "Content-Disposition": `attachment; filename="${doc.filename}"`,
    "Content-Length": String(doc.sizeBytes),
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
