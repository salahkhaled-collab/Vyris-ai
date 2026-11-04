import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getScope } from "@/lib/task-access";
import { loadRiskSignals } from "@/lib/risk-signals-server";

export const dynamic = "force-dynamic";

/** GET /api/risk-signals: cross-module evidence of delivery, workload and strategy risk. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  try {
    const signals = await loadRiskSignals(await getScope(session.user.id));
    return NextResponse.json(signals);
  } catch (err: unknown) {
    console.error("Loading risk signals failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
