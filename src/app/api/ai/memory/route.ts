import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { deleteNote, listNotes } from "@/lib/ai/context";

export const dynamic = "force-dynamic";

/** GET /api/ai/memory?limit=50 — the signed-in user's saved notes, newest first. */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("limit");
  const parsed = raw === null ? undefined : Number.parseInt(raw, 10);
  const limit = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;

  try {
    const { notes, total } = await listNotes(session.user.id, { limit });
    return NextResponse.json({
      total,
      notes: notes.map((n) => ({ id: n.id, content: n.content, createdAt: n.createdAt.toISOString() })),
    });
  } catch (err: unknown) {
    console.error("Listing notes failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** DELETE /api/ai/memory?id=<noteId> — remove one of the signed-in user's notes. */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  try {
    const result = await deleteNote(session.user.id, id);
    if (result.deleted) return NextResponse.json({ ok: true });
    const status = result.reason === "invalid_id" ? 400 : 404;
    return NextResponse.json({ error: result.reason }, { status });
  } catch (err: unknown) {
    console.error("Deleting note failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
