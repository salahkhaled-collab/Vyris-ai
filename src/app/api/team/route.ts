import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { sendEmail, teamMessageEmailHtml } from "@/lib/email";

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
    return NextResponse.json({ members: [], messages: [] });
  }

  const members = await prisma.user.findMany({
    where: { teamId: user.teamId },
    select: { id: true, name: true, email: true, image: true },
  });

  const messages = await prisma.teamMessage.findMany({
    where: { teamId: user.teamId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      channel: true,
      createdAt: true,
      authorId: true,
      recipientId: true,
    },
  });

  return NextResponse.json({ members, messages, teamId: user.teamId });
}

interface SendMessageBody {
  content: string;
  channel: "message" | "email";
  recipientId: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { teamId: true },
  });

  if (!user?.teamId) {
    return NextResponse.json({ error: "no_team" }, { status: 400 });
  }

  let body: SendMessageBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.content?.trim() || !body.recipientId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Only allow sending to someone actually on the same team — prevents
  // using this endpoint to email arbitrary userIds.
  const recipient = await prisma.user.findFirst({
    where: { id: body.recipientId, teamId: user.teamId },
    select: { id: true, name: true, email: true },
  });
  if (!recipient) {
    return NextResponse.json({ error: "recipient_not_in_team" }, { status: 400 });
  }

  const message = await prisma.teamMessage.create({
    data: {
      content: body.content.trim(),
      channel: body.channel === "email" ? "email" : "message",
      teamId: user.teamId,
      authorId: session.user.id,
      recipientId: body.recipientId,
    },
  });

  let emailResult: { sent: boolean; reason?: string } | null = null;

  if (body.channel === "email") {
    if (!recipient.email) {
      emailResult = { sent: false, reason: "Recipient has no email on file." };
    } else {
      emailResult = await sendEmail({
        to: recipient.email,
        subject: `Message from ${session.user.name ?? "a teammate"} on Vela`,
        html: teamMessageEmailHtml({
          senderName: session.user.name ?? "A teammate",
          content: body.content.trim(),
        }),
      });
    }
  }

  return NextResponse.json({
    ...message,
    emailSent: emailResult?.sent ?? null,
    emailError: emailResult?.sent === false ? emailResult.reason : null,
  });
}
