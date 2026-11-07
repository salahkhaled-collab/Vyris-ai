import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isShareableType, setSharing } from "@/lib/sharing";

/** PATCH /api/sharing { type, id, share } — owner-only; team comes from the owner's account. */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  const { type, id, share } = (body ?? {}) as { type?: unknown; id?: unknown; share?: unknown };
  if (!isShareableType(type) || typeof id !== "string" || !id || typeof share !== "boolean") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await setSharing(type, id, session.user.id, share);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  }
  return NextResponse.json({ teamId: result.teamId });
}
