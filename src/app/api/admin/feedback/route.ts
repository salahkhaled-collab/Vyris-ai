import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { csvCell, isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** GET /api/admin/feedback: all feedback, newest first. Owner only; others get 404. ?format=csv downloads it. */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!isAdminEmail(session.user.email)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const rows = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: { id: true, message: true, mood: true, page: true, createdAt: true, user: { select: { name: true, email: true } } },
  });
  const entries = rows.map((r) => ({
    id: r.id,
    message: r.message,
    mood: r.mood,
    page: r.page,
    createdAt: r.createdAt.toISOString(),
    name: r.user.name,
    email: r.user.email,
  }));

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const lines = [
      ["Date", "Name", "Email", "Mood", "Page", "Message"].map(csvCell).join(","),
      ...entries.map((e) => [e.createdAt, e.name, e.email, e.mood, e.page, e.message].map(csvCell).join(",")),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="vyris-feedback.csv"',
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.json({ entries }, { headers: { "Cache-Control": "no-store" } });
}
