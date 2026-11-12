import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { csvCell, isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MAX_ROWS = 5000;

/**
 * GET /api/admin/waitlist: everyone who joined the waitlist, newest first.
 * Owner only (ADMIN_EMAILS). Anyone else gets a plain 404 so the endpoint
 * doesn't advertise itself. ?format=csv downloads a spreadsheet.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!isAdminEmail(session.user.email)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [total, entries] = await Promise.all([
    prisma.waitlistEntry.count(),
    prisma.waitlistEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      select: { id: true, name: true, email: true, company: true, source: true, createdAt: true },
    }),
  ]);

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const rows = [
      ["Joined (UTC)", "Name", "Email", "Company", "Source"].map(csvCell).join(","),
      ...entries.map((e) =>
        [e.createdAt.toISOString().replace("T", " ").slice(0, 16), e.name, e.email, e.company, e.source].map(csvCell).join(",")
      ),
    ];
    return new NextResponse("﻿" + rows.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vyris-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ total, entries }, { headers: { "Cache-Control": "no-store" } });
}
