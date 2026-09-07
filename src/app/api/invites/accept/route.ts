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

  let body: AcceptBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.token) {
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
  if (invite.email && session.user.email && invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json(
      {
        error: "email_mismatch",
        message: `This invite was sent to ${invite.email}. Sign in with that account to accept it.`,
      },
      { status: 403 }
    );
  }

  // Join the team, mark workspaceType as TEAM so onboarding's workspace
  // step is skipped (decided by the invite), and apply whatever
  // role/accessLevel the inviter chose for this person.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        teamId: invite.teamId,
        workspaceType: "TEAM",
        role: invite.role ?? undefined,
        accessLevel: invite.accessLevel,
      },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { status: "accepted", acceptedBy: session.user.id },
    }),
  ]);

  const team = await prisma.team.findUnique({ where: { id: invite.teamId } });

  return NextResponse.json({ joined: true, teamName: team?.name ?? "the team" });
}
