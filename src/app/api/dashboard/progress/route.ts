import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

const WEEKS = 8;
const DAY = 86400000;

function weekStart(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); // Monday
  return x;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const ownerId = session.user.id;

  const since = weekStart(new Date());
  since.setUTCDate(since.getUTCDate() - 7 * (WEEKS - 1));

  const [grouped, doneRecent] = await Promise.all([
    prisma.task.groupBy({ by: ["status"], where: { ownerId }, _count: { _all: true } }),
    prisma.task.findMany({
      where: { ownerId, status: "DONE", updatedAt: { gte: since } },
      select: { updatedAt: true },
    }),
  ]);

  const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const g of grouped) counts[g.status] = g._count._all;

  const weeks = Array.from({ length: WEEKS }, (_, i) => ({
    start: new Date(since.getTime() + i * 7 * DAY).toISOString().slice(0, 10),
    done: 0,
  }));
  for (const t of doneRecent) {
    const idx = Math.floor((weekStart(t.updatedAt).getTime() - since.getTime()) / (7 * DAY));
    if (idx >= 0 && idx < WEEKS) weeks[idx].done++;
  }

  return NextResponse.json({ counts, weeks });
}``