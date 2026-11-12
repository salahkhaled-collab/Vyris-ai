import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/** DELETE: a team admin revokes a pending invite, so its link stops working. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { teamId: true, accessLevel: true } });
  if (!me?.teamId || me.accessLevel !== "ADMIN") {
    return NextResponse.json({ error: "forbidden", message: "Only team admins can revoke invites." }, { status: 403 });
  }
  const revoked = await prisma.invite.updateMany({
    where: { id: params.id, teamId: me.teamId, status: "pending" },
    data: { status: "revoked" },
  });
  if (revoked.count !== 1) return NextResponse.json({ error: "not_found", message: "That invite isn't pending." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
