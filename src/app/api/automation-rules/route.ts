import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const rules = await prisma.automationRule.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.name?.trim() || !body.trigger?.trim() || !body.action?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const rule = await prisma.automationRule.create({
    data: {
      name: body.name.trim(),
      trigger: body.trigger.trim(),
      action: body.action.trim(),
      status: "ACTIVE",
      ownerId: session.user.id,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
