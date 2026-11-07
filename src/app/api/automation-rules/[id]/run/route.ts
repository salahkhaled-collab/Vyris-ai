import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { runScheduledRule } from "@/lib/automation/engine";
import { SCHEDULED_TRIGGERS, isTriggerKey } from "@/lib/automation/rules";

export const maxDuration = 60;

/** POST /api/automation-rules/[id]/run — "Run now" for a scheduled rule (owner only). */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const rule = await prisma.automationRule.findUnique({
    where: { id: params.id },
    select: { id: true, ownerId: true, trigger: true, action: true },
  });
  if (!rule) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (rule.ownerId !== session.user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isTriggerKey(rule.trigger) || !SCHEDULED_TRIGGERS.includes(rule.trigger)) {
    return NextResponse.json(
      { error: "not_scheduled", message: "This rule runs by itself when a task changes. Try it by changing a task." },
      { status: 400 }
    );
  }

  const outcome = await runScheduledRule(rule, new Date(), true);
  return NextResponse.json({ outcome });
}
