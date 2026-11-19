// Gathers the rows behind the investor metrics. Activity comes from the
// daily visit log (UserActivityDay) plus things users already did before that
// log existed: messages they sent the assistant, and projects, tasks and
// decisions they created. Automated changes (e.g. a task's updatedAt bumped
// by a rule) are deliberately not counted as activity.

import { prisma } from "@/lib/prisma";
import { hasFeatureScopes } from "@/lib/google-scopes";
import { WEEKS, computeMetrics, dayKey, weekStart, type InvestorMetrics } from "@/lib/investor-metrics";

const DAY_MS = 86_400_000;
const MAX_ROWS = 50_000;

export async function loadInvestorMetrics(now: Date = new Date()): Promise<InvestorMetrics> {
  // Enough history for 8 weekly rows plus 4 weeks of retention after the oldest.
  const since = new Date(weekStart(now).getTime() - (WEEKS + 4) * 7 * DAY_MS);

  const [users, accounts, projectOwners, conversationOwners, visits, aiMessages, tasks, projects, decisions, waitlist] =
    await Promise.all([
      prisma.user.findMany({ select: { id: true, createdAt: true }, take: MAX_ROWS }),
      prisma.account.findMany({ where: { provider: "google" }, select: { userId: true, scope: true }, take: MAX_ROWS }),
      prisma.project.groupBy({ by: ["ownerId"] }),
      prisma.aiConversation.groupBy({ by: ["ownerId"] }),
      prisma.userActivityDay.findMany({ where: { day: { gte: dayKey(since) } }, select: { userId: true, day: true }, take: MAX_ROWS }),
      prisma.aiMessage.findMany({
        where: { role: "user", createdAt: { gte: since } },
        select: { createdAt: true, conversation: { select: { ownerId: true } } },
        take: MAX_ROWS,
      }),
      prisma.task.findMany({ where: { createdAt: { gte: since } }, select: { ownerId: true, createdAt: true }, take: MAX_ROWS }),
      prisma.project.findMany({ where: { createdAt: { gte: since } }, select: { ownerId: true, createdAt: true }, take: MAX_ROWS }),
      prisma.decision.findMany({ where: { createdAt: { gte: since } }, select: { ownerId: true, createdAt: true }, take: MAX_ROWS }),
      prisma.waitlistEntry.findMany({ select: { createdAt: true }, take: MAX_ROWS }),
    ]);
  const briefRules = await prisma.automationRule.findMany({
    where: { trigger: "daily_digest", status: "ACTIVE" },
    select: { ownerId: true },
    take: MAX_ROWS,
  });

  const activeDays = new Map<string, Set<string>>();
  const mark = (userId: string, day: string) => {
    const set = activeDays.get(userId) ?? new Set<string>();
    set.add(day);
    activeDays.set(userId, set);
  };
  for (const v of visits) mark(v.userId, v.day);
  for (const m of aiMessages) mark(m.conversation.ownerId, dayKey(m.createdAt));
  for (const r of [...tasks, ...projects, ...decisions]) mark(r.ownerId, dayKey(r.createdAt));

  const connected = new Set(
    accounts.filter((a) => hasFeatureScopes(a.scope, "gmail") || hasFeatureScopes(a.scope, "calendar")).map((a) => a.userId)
  );
  const withGmail = new Set(accounts.filter((a) => hasFeatureScopes(a.scope, "gmail")).map((a) => a.userId));
  const pushUsers = await prisma.pushSubscription.findMany({ distinct: ["userId"], select: { userId: true }, take: MAX_ROWS });
  const withBrief = new Set([...briefRules.map((r) => r.ownerId), ...pushUsers.map((p) => p.userId)]);
  const madeProject = new Set(projectOwners.map((p) => p.ownerId));
  const usedAi = new Set(conversationOwners.map((c) => c.ownerId));

  return computeMetrics({
    now,
    users: users.map((u) => ({
      id: u.id,
      createdAt: u.createdAt,
      activated: connected.has(u.id) || madeProject.has(u.id) || usedAi.has(u.id),
      gmail: withGmail.has(u.id),
      brief: withBrief.has(u.id),
    })),
    activeDays,
    waitlist: waitlist.map((w) => w.createdAt),
  });
}

/** Records that the user opened the app today (UTC). One row per day; repeats do nothing. */
export async function recordVisit(userId: string, now: Date = new Date()): Promise<void> {
  await prisma.userActivityDay.createMany({ data: [{ userId, day: dayKey(now) }], skipDuplicates: true });
}
