import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

interface PatchBody {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  notes?: string;
  tag?: string;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const contact = await prisma.contact.findUnique({ where: { id: params.id } });
  if (!contact) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (contact.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const updated = await prisma.contact.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.email !== undefined && { email: body.email.trim() || null }),
      ...(body.phone !== undefined && { phone: body.phone.trim() || null }),
      ...(body.company !== undefined && { company: body.company.trim() || null }),
      ...(body.role !== undefined && { role: body.role.trim() || null }),
      ...(body.notes !== undefined && { notes: body.notes.trim() || null }),
      ...(body.tag !== undefined && { tag: body.tag.trim() || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const contact = await prisma.contact.findUnique({ where: { id: params.id } });
  if (!contact) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (contact.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
