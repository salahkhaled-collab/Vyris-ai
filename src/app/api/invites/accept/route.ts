import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

interface AcceptBody {
  token: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const raw: unknown = await req.json().catch(() => null);
  const body = (raw && typeof raw === "object" ? raw : {}) as Partial<AcceptBody>;

  if (typeof body.token !== "string" || !body.token || body.token.length > 200) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const invite = await prisma.invite.findUnique({ where: { token: body.token } });

  if (!invite) {
    return NextResponse.json(
      { error: "not_found", message: "This invite link is invalid." },
      { status: 404 }
    );
  }

  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: "already_used", message: "This invite has already been used or revoked." },
      { status: 410 }
    );
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "expired", message: "This invite has expired. Ask for a new one." },
      { status: 410 }
    );
  }

  // If the invite was sent to a specific email, only that account may accept it.
  if (invite.email && invite.email.toLowerCase() !== (session.user.email ?? "").toLowerCase()) {
    return NextResponse.json(
      {
        error: "email_mismatch",
        message: `This invite was sent to ${invite.email}. Sign in with that account to accept it.`,
      },
      { status: 403 }
    );
  }

  // Never silently move someone off a team that has other people on it:
  // their shared work would stay behind with the old team.
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { teamId: true } });
  if (me?.teamId === invite.teamId) {
    return NextResponse.json(
      { error: "already_member", message: "You're already on this team." },
      { status: 409 }
    );
  }
  if (me?.teamId) {
    const others = await prisma.user.count({ where: { teamId: me.teamId, id: { not: session.user.id } } });
    if (others > 0) {
      return NextResponse.json(
        {
          error: "already_on_team",
          message: "You're already on another team with other people. Leaving a team isn't supported yet.",
        },
        { status: 409 }
      );
    }
  }

  // Claim the invite and join in one transaction. The conditional update makes
  // a second, concurrent accept of the same link fail instead of both joining.
  const joined = await prisma.$transaction(async (tx) => {
    const claimed = await tx.invite.updateMany({
      where: { id: invite.id, status: "pending" },
      data: { status: "accepted", acceptedBy: session.user.id },
    });
    if (claimed.count !== 1) return false;
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        teamId: invite.teamId,
        workspaceType: "TEAM",
        role: invite.role ?? undefined,
        accessLevel: invite.accessLevel,
      },
    });
    return true;
  });
  if (!joined) {
    return NextResponse.json(
      { error: "already_used", message: "This invite has already been used or revoked." },
      { status: 410 }
    );
  }

  const team = await prisma.team.findUnique({ where: { id: invite.teamId } });

  return NextResponse.json({ joined: true, teamName: team?.name ?? "the team" });
}
