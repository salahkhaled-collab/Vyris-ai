import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { sendEmail, inviteEmailHtml } from "@/lib/email";

const INVITE_EXPIRY_DAYS = 7;

function getBaseUrl(req: NextRequest): string {
  return process.env.NEXTAUTH_URL || req.nextUrl.origin;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  if (!user?.teamId) {
    return NextResponse.json({ invites: [] });
  }

  const invites = await prisma.invite.findMany({
    where: { teamId: user.teamId, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, email: true, createdAt: true, expiresAt: true, role: true, accessLevel: true },
  });

  return NextResponse.json({ invites });
}

interface CreateInviteBody {
  email?: string; // omit for a link-only invite
  role?: string;
  accessLevel?: string;
}

const VALID_ROLES = ["CEO", "FOUNDER", "EXECUTIVE", "MANAGER", "OTHER"];
const VALID_ACCESS_LEVELS = ["ADMIN", "MEMBER"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true, name: true },
  });

  if (!user?.teamId) {
    return NextResponse.json(
      { error: "no_team", message: "You need a Team workspace before inviting people." },
      { status: 400 }
    );
  }

  let body: CreateInviteBody = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — link-only invite
  }

  if (body.role !== undefined && body.role !== null && !VALID_ROLES.includes(body.role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  if (body.accessLevel !== undefined && !VALID_ACCESS_LEVELS.includes(body.accessLevel)) {
    return NextResponse.json({ error: "invalid_access_level" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: user.teamId } });
  if (!team) {
    return NextResponse.json({ error: "team_not_found" }, { status: 404 });
  }

  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: {
      teamId: user.teamId,
      invitedBy: session.user.id,
      email: body.email?.trim() || null,
      role: (body.role as "CEO" | "FOUNDER" | "EXECUTIVE" | "MANAGER" | "OTHER" | undefined) ?? null,
      accessLevel: (body.accessLevel as "ADMIN" | "MEMBER" | undefined) ?? "MEMBER",
      expiresAt,
    },
  });

  const inviteUrl = `${getBaseUrl(req)}/invite/${invite.token}`;

  let emailResult: { sent: boolean; reason?: string } | null = null;

  if (body.email?.trim()) {
    emailResult = await sendEmail({
      to: body.email.trim(),
      subject: `You're invited to join ${team.name} on Vyris`,
      html: inviteEmailHtml({
        inviterName: user.name ?? "Someone",
        teamName: team.name,
        inviteUrl,
      }),
    });
  }

  return NextResponse.json({
    id: invite.id,
    token: invite.token,
    inviteUrl,
    email: invite.email,
    expiresAt: invite.expiresAt,
    emailSent: emailResult?.sent ?? null,
    emailError: emailResult?.sent === false ? emailResult.reason : null,
  });
}
