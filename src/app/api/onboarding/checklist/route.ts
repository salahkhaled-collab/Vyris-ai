import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/ai/scope";
import { getScope } from "@/lib/task-access";
import { hasFeatureScopes } from "@/lib/google-scopes";

/**
 * GET /api/onboarding/checklist: which first steps a user has done, for the
 * "Get started" card on Home. Reads only; nothing here calls Google.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const userId = session.user.id;
  const scope = await getScope(userId);

  const [account, project, digest] = await Promise.all([
    prisma.account.findFirst({ where: { userId, provider: "google" }, select: { scope: true } }),
    prisma.project.findFirst({ where: scopeFilter(scope), select: { id: true } }),
    prisma.automationRule.findFirst({
      where: { ownerId: userId, trigger: "daily_digest", status: "ACTIVE" },
      select: { id: true },
    }),
  ]);

  return NextResponse.json({
    gmail: hasFeatureScopes(account?.scope, "gmail"),
    calendar: hasFeatureScopes(account?.scope, "calendar"),
    project: Boolean(project),
    digest: Boolean(digest),
  });
}
