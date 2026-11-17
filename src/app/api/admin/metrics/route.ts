import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isAdminEmail } from "@/lib/admin";
import { loadInvestorMetrics } from "@/lib/investor-metrics-server";
import { metricsCsv } from "@/lib/investor-metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/admin/metrics: sign-ups, activation, active users, retention and
 * waitlist. Owner only (ADMIN_EMAILS); anyone else gets a plain 404.
 * ?format=csv downloads it for a data room.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!isAdminEmail(session.user.email)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const metrics = await loadInvestorMetrics();
  if (req.nextUrl.searchParams.get("format") === "csv") {
    return new NextResponse(metricsCsv(metrics), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vyris-metrics-${metrics.generatedAt.slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.json(metrics, { headers: { "Cache-Control": "no-store" } });
}
