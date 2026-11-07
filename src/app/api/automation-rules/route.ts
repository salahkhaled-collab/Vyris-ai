import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { validateRule } from "@/lib/automation/rules";

const MAX_RULES = 30;

/** GET: the user's rules, each with its most recent run. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const rules = await prisma.automationRule.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      runs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, detail: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    rules: rules.map(({ runs, ...r }) => ({ ...r, lastRun: runs[0] ?? null })),
  });
}

/** POST { name, trigger, action } — structured rules only, so they can actually run. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  const { name, trigger, action } = (body ?? {}) as { name?: unknown; trigger?: unknown; action?: unknown };
  const cleanName = typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 100) : "";
  if (!cleanName) return NextResponse.json({ error: "missing_name", message: "Give the rule a name." }, { status: 400 });

  const valid = validateRule(trigger, action);
  if (typeof valid === "string") return NextResponse.json({ error: "invalid_rule", message: valid }, { status: 400 });

  const count = await prisma.automationRule.count({ where: { ownerId: session.user.id } });
  if (count >= MAX_RULES) {
    return NextResponse.json({ error: "too_many", message: `You can have up to ${MAX_RULES} rules.` }, { status: 400 });
  }

  const rule = await prisma.automationRule.create({
    data: {
      name: cleanName,
      trigger: valid.trigger,
      action: JSON.stringify(valid.action),
      status: "ACTIVE",
      ownerId: session.user.id,
    },
  });

  return NextResponse.json({ ...rule, lastRun: null }, { status: 201 });
}
