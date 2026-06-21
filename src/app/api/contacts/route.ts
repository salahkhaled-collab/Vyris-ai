import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        ...(user?.teamId ? [{ teamId: user.teamId }] : []),
      ],
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ contacts });
}

interface CreateContactBody {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  notes?: string;
  tag?: string;
  shareWithTeam?: boolean;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: CreateContactBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  const contact = await prisma.contact.create({
    data: {
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      company: body.company?.trim() || null,
      role: body.role?.trim() || null,
      notes: body.notes?.trim() || null,
      tag: body.tag?.trim() || null,
      ownerId: session.user.id,
      teamId: body.shareWithTeam && user?.teamId ? user.teamId : null,
    },
  });

  return NextResponse.json(contact);
}
