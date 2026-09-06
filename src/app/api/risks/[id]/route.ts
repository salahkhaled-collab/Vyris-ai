import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

async function canAccessRisk(userId: string, riskId: string) {
  const risk = await prisma.risk.findUnique({ where: { id: riskId } });
  if (!risk) return { risk: null, allowed: false };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { teamId: true } });
  const allowed = risk.ownerId === userId || (risk.teamId !== null && risk.teamId === user?.teamId);

  return { risk, allowed };
}

const VALID_STATUSES = ["OPEN", "MITIGATING", "RESOLVED"];
const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { risk, allowed } = await canAccessRisk(session.user.id, params.id);
  if (!risk) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { status?: string; severity?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const data: { status?: "OPEN" | "MITIGATING" | "RESOLVED"; severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" } = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    data.status = body.status as "OPEN" | "MITIGATING" | "RESOLVED";
  }

  if (body.severity !== undefined) {
    if (!VALID_SEVERITIES.includes(body.severity)) {
      return NextResponse.json({ error: "invalid_severity" }, { status: 400 });
    }
    data.severity = body.severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }

  const updated = await prisma.risk.update({ where: { id: params.id }, data });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { risk, allowed } = await canAccessRisk(session.user.id, params.id);
  if (!risk) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.risk.delete({ where: { id: params.id } });

  return NextResponse.json({ deleted: true });
}
