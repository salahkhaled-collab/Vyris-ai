import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google-token";
import { completeWithPythonLlm, pythonLlmConfigured } from "@/lib/ai/python-client";
import { scopeFilter } from "@/lib/ai/scope";
import { getScope } from "@/lib/task-access";
import { listInbox, parseRecipient } from "@/lib/gmail";
import { applyContactOverride, parseTriage, triagePrompt, triageUserMessage } from "@/lib/inbox-ai";

export const maxDuration = 60;

/** POST /api/ai/inbox/triage — classify the latest inbox emails. Read-only. */
export async function POST() {
  if (!pythonLlmConfigured()) {
    return NextResponse.json({ error: "missing_llm_url", message: "The AI isn't configured." }, { status: 500 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { accessToken } = await getGoogleAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json({ error: "no_gmail", message: "Connect Gmail first." }, { status: 401 });
  }

  try {
    const scope = await getScope(session.user.id);
    const [emails, projects, user, contacts] = await Promise.all([
      listInbox(accessToken, 15),
      prisma.project.findMany({
        where: { ...scopeFilter(scope), status: "ACTIVE" },
        select: { id: true, title: true },
        take: 50,
      }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
      prisma.contact.findMany({
        where: { ...scopeFilter(scope), email: { not: null } },
        select: { email: true },
        take: 2000,
      }),
    ]);
    if (emails.length === 0) return NextResponse.json({ results: {} });

    const completion = await completeWithPythonLlm({
      system: triagePrompt(projects, user?.name ?? null),
      messages: [{ role: "user", content: triageUserMessage(emails) }],
      maxTokens: 1500,
    });
    const parsed = parseTriage(
      completion.text,
      emails.map((e) => e.id),
      projects.map((p) => p.id)
    );
    if (!parsed) {
      return NextResponse.json({ error: "unparseable", message: "Couldn't sort your inbox right now. Try again." }, { status: 422 });
    }
    // Anyone in the user's Contacts is always work.
    const contactEmails = new Set(
      contacts.map((c) => c.email?.trim().toLowerCase()).filter((e): e is string => Boolean(e))
    );
    const results = applyContactOverride(
      parsed,
      Object.fromEntries(emails.map((e) => [e.id, parseRecipient(e.fromEmail)])),
      contactEmails
    );
    return NextResponse.json({
      results,
      projects: Object.fromEntries(projects.map((p) => [p.id, p.title])),
    });
  } catch (err: unknown) {
    console.error("Inbox triage failed:", err);
    return NextResponse.json({ error: "triage_failed", message: "Couldn't sort your inbox right now." }, { status: 502 });
  }
}
