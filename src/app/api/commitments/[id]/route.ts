import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { STATUSES, parseDay, type CommitmentStatusValue } from "@/lib/commitments";

type Ctx = { params: { id: string } };

/** PATCH /api/commitments/:id { status?, dueDate? }: mark done, drop, reopen or move the date. Own rows only. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid", message: "Send a JSON object." }, { status: 400 });

  const data: { status?: CommitmentStatusValue; doneAt?: Date | null; dueDate?: Date | null } = {};
  if (body.status !== undefined) {
    const status = typeof body.status === "string" ? body.status.toUpperCase() : "";
    if (!(STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: "invalid", message: "status must be OPEN, DONE or DROPPED." }, { status: 400 });
    }
    data.status = status as CommitmentStatusValue;
    data.doneAt = status === "OPEN" ? null : new Date();
  }
  if (body.dueDate !== undefined) {
    if (body.dueDate === null || body.dueDate === "") data.dueDate = null;
    else {
      const day = parseDay(body.dueDate);
      if (!day) return NextResponse.json({ error: "invalid", message: "dueDate must be a date like 2026-11-20." }, { status: 400 });
      data.dueDate = new Date(`${day}T00:00:00.000Z`);
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "invalid", message: "Nothing to change." }, { status: 400 });
  }

  const result = await prisma.commitment.updateMany({ where: { id: params.id, ownerId: session.user.id }, data });
  if (result.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/commitments/:id: remove one of your own promises. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const result = await prisma.commitment.deleteMany({ where: { id: params.id, ownerId: session.user.id } });
  if (result.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
