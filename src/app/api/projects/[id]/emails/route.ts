import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { scopeFilter } from "@/lib/ai/scope";
import { getScope } from "@/lib/task-access";
import { getGoogleAccessToken } from "@/lib/google-token";
import { GmailError, getMessageMeta, parseRecipient } from "@/lib/gmail";

const MAX_LINKS_PER_PROJECT = 200;

const SELECT = {
  id: true,
  threadId: true,
  messageId: true,
  subject: true,
  fromName: true,
  fromEmail: true,
  snippet: true,
  receivedAt: true,
  linkedById: true,
  createdAt: true,
} as const;

/** The project, if the caller can see it (own or same team). */
async function visibleProject(userId: string, projectId: string) {
  const scope = await getScope(userId);
  return prisma.project.findFirst({
    where: { id: projectId, ...scopeFilter(scope) },
    select: { id: true, ownerId: true, title: true },
  });
}

/** GET /api/projects/:id/emails — emails saved to this project, newest first. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const project = await visibleProject(session.user.id, params.id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const emails = await prisma.projectEmail.findMany({
    where: { projectId: project.id },
    select: SELECT,
    orderBy: { receivedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ emails });
}

/**
 * POST /api/projects/:id/emails { messageId } — save a Gmail thread to a project.
 * Subject, sender and snippet are read from the caller's own Gmail, never
 * from the request, so nobody can attach an email they don't have.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const userId = session.user.id;

  const body: unknown = await req.json().catch(() => null);
  const messageId = (body as { messageId?: unknown } | null)?.messageId;
  if (typeof messageId !== "string" || !/^[A-Za-z0-9_-]{6,128}$/.test(messageId)) {
    return NextResponse.json({ error: "invalid_input", message: "Pick an email first." }, { status: 400 });
  }

  const project = await visibleProject(userId, params.id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { accessToken } = await getGoogleAccessToken(userId, "gmail");
  if (!accessToken) return NextResponse.json({ error: "no_gmail", message: "Connect Gmail first." }, { status: 401 });

  let meta;
  try {
    meta = await getMessageMeta(accessToken, messageId);
  } catch (err) {
    const status = err instanceof GmailError && err.status === 404 ? 404 : 502;
    return NextResponse.json(
      { error: "gmail_error", message: status === 404 ? "That email isn't in your Gmail." : "Couldn't reach Gmail." },
      { status }
    );
  }

  const count = await prisma.projectEmail.count({ where: { projectId: project.id } });
  if (count >= MAX_LINKS_PER_PROJECT) {
    return NextResponse.json({ error: "limit", message: "This project already has 200 saved emails." }, { status: 400 });
  }

  const data = {
    messageId: meta.id,
    subject: meta.subject.slice(0, 300),
    fromName: meta.from.slice(0, 200),
    fromEmail: parseRecipient(meta.fromEmail),
    snippet: meta.snippet.slice(0, 500),
    receivedAt: new Date(meta.timestamp),
  };
  // One row per thread per project: saving a newer message of the same thread refreshes it.
  const email = await prisma.projectEmail.upsert({
    where: { projectId_threadId: { projectId: project.id, threadId: meta.threadId } },
    create: { ...data, projectId: project.id, threadId: meta.threadId, linkedById: userId },
    update: data,
    select: SELECT,
  });
  return NextResponse.json({ email, project: { id: project.id, title: project.title } }, { status: 201 });
}

/** DELETE /api/projects/:id/emails?linkId=… — unlink (whoever saved it, or the project owner). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const linkId = req.nextUrl.searchParams.get("linkId");
  if (!linkId) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const project = await visibleProject(session.user.id, params.id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const link = await prisma.projectEmail.findFirst({ where: { id: linkId, projectId: project.id }, select: { id: true, linkedById: true } });
  if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (link.linkedById !== session.user.id && project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await prisma.projectEmail.delete({ where: { id: link.id } });
  return NextResponse.json({ ok: true });
}
