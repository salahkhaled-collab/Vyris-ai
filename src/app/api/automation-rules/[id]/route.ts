import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

async function canAccessRule(userId: string, ruleId: string) {
  const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
  if (!rule) return { rule: null, allowed: false };
  return { rule, allowed: rule.ownerId === userId };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { rule, allowed } = await canAccessRule(session.user.id, params.id);
  if (!rule) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const validStatuses = ["ACTIVE", "PAUSED"];
  if (!body.status || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const updated = await prisma.automationRule.update({
    where: { id: params.id },
    data: { status: body.status as "ACTIVE" | "PAUSED" },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { rule, allowed } = await canAccessRule(session.user.id, params.id);
  if (!rule) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.automationRule.delete({ where: { id: params.id } });

  return NextResponse.json({ deleted: true });
}
