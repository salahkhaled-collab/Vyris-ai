import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { safeTimeZone } from "@/lib/calendar";
import { MAX_OPEN, isOverdue, sortCommitments, validateCommitment } from "@/lib/commitments";

export const dynamic = "force-dynamic";

const SOURCES = new Set(["manual", "email", "assistant"]);

const SELECT = {
  id: true,
  text: true,
  counterpart: true,
  direction: true,
  dueDate: true,
  status: true,
  source: true,
  sourceRef: true,
  doneAt: true,
  createdAt: true,
} as const;

/** GET /api/commitments: open promises (late first) and the last 10 closed. Only the user's own. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const userId = session.user.id;
  const [open, closed, user] = await Promise.all([
    prisma.commitment.findMany({
      where: { ownerId: userId, status: "OPEN" },
      select: SELECT,
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: MAX_OPEN,
    }),
    prisma.commitment.findMany({
      where: { ownerId: userId, status: { not: "OPEN" } },
      select: SELECT,
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } }),
  ]);
  const timeZone = safeTimeZone(user?.timeZone);
  const now = new Date();
  const show = <T extends { dueDate: Date | null }>(c: T) => ({
    ...c,
    dueDate: c.dueDate ? c.dueDate.toISOString().slice(0, 10) : null,
    overdue: isOverdue(c.dueDate, now, timeZone),
  });
  return NextResponse.json(
    { open: sortCommitments(open).map(show), closed: closed.map(show), timeZone },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** POST /api/commitments { text, direction, counterpart?, dueDate?, source?, sourceRef? } */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body: unknown = await req.json().catch(() => null);
  const v = validateCommitment(body);
  if (!v.ok) return NextResponse.json({ error: "invalid", message: v.error }, { status: 400 });

  const o = body as Record<string, unknown>;
  const source = typeof o.source === "string" && SOURCES.has(o.source) ? o.source : "manual";
  const sourceRef =
    typeof o.sourceRef === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(o.sourceRef) ? o.sourceRef : null;

  const openCount = await prisma.commitment.count({ where: { ownerId: session.user.id, status: "OPEN" } });
  if (openCount >= MAX_OPEN) {
    return NextResponse.json(
      { error: "too_many", message: `You have ${MAX_OPEN} open promises. Close some first.` },
      { status: 400 }
    );
  }

  // Tracking the same promise from the same thread twice does nothing.
  if (sourceRef) {
    const existing = await prisma.commitment.findFirst({
      where: { ownerId: session.user.id, sourceRef, text: v.value.text, direction: v.value.direction },
      select: SELECT,
    });
    if (existing) return NextResponse.json({ commitment: existing, duplicate: true });
  }

  const commitment = await prisma.commitment.create({
    data: {
      ownerId: session.user.id,
      text: v.value.text,
      counterpart: v.value.counterpart,
      direction: v.value.direction,
      dueDate: v.value.dueDate ? new Date(`${v.value.dueDate}T00:00:00.000Z`) : null,
      source,
      sourceRef,
    },
    select: SELECT,
  });
  return NextResponse.json({ commitment }, { status: 201 });
}
