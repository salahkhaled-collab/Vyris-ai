import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getGoogleAccessToken } from "@/lib/google-token";
import { completeWithPythonLlm, pythonLlmConfigured } from "@/lib/ai/python-client";
import { scopeFilter } from "@/lib/ai/scope";
import { getScope } from "@/lib/task-access";
import { getMailboxAddress, listInbox, parseRecipient } from "@/lib/gmail";
import {
  AUTOMATION_TRIAGE,
  applyContactOverride,
  isVyrisAutomationEmail,
  parseTriage,
  rateLimitMessage,
  rateLimitWait,
  triagePrompt,
  triageUserMessage,
} from "@/lib/inbox-ai";

export const maxDuration = 60;

/**
 * POST /api/ai/inbox/triage { knownIds?: string[] } — classify the latest inbox
 * emails, skipping ids the client already has results for. Read-only.
 */
export async function POST(req: NextRequest) {
  if (!pythonLlmConfigured()) {
    return NextResponse.json({ error: "missing_llm_url", message: "The AI isn't configured." }, { status: 500 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { accessToken } = await getGoogleAccessToken(session.user.id, "gmail");
  if (!accessToken) {
    return NextResponse.json({ error: "no_gmail", message: "Connect Gmail first." }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  const knownRaw = (body as { knownIds?: unknown } | null)?.knownIds;
  const known = new Set(Array.isArray(knownRaw) ? knownRaw.filter((x): x is string => typeof x === "string").slice(0, 100) : []);

  try {
    const scope = await getScope(session.user.id);
    const [inbox, mailbox, projects, user, contacts] = await Promise.all([
      listInbox(accessToken, 15),
      getMailboxAddress(accessToken),
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
    // Only new emails go to the AI: saves the provider's per-minute token budget.
    const fresh = inbox.filter((e) => !known.has(e.id));
    // Vyris's own digests and alerts are filed without asking the model.
    const automated: Record<string, typeof AUTOMATION_TRIAGE> = {};
    for (const e of fresh) {
      if (isVyrisAutomationEmail(e.subject, parseRecipient(e.fromEmail), mailbox)) automated[e.id] = AUTOMATION_TRIAGE;
    }
    const emails = fresh.filter((e) => !automated[e.id]);
    if (emails.length === 0) {
      return NextResponse.json({ results: automated, projects: Object.fromEntries(projects.map((p) => [p.id, p.title])) });
    }

    const completion = await completeWithPythonLlm({
      system: triagePrompt(projects, user?.name ?? null),
      messages: [{ role: "user", content: triageUserMessage(emails) }],
      maxTokens: 2000,
    });
    const parsed = parseTriage(
      completion.text,
      emails.map((e) => e.id),
      projects.map((p) => p.id)
    );
    if (!parsed) {
      console.error("Inbox triage: unparseable reply", { emails: emails.length, chars: completion.text.length });
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
      results: { ...results, ...automated },
      projects: Object.fromEntries(projects.map((p) => [p.id, p.title])),
    });
  } catch (err: unknown) {
    const wait = rateLimitWait(err);
    if (wait !== null) {
      return NextResponse.json({ error: "rate_limited", message: rateLimitMessage(wait), retryAfter: wait }, { status: 429 });
    }
    console.error("Inbox triage failed:", err);
    return NextResponse.json({ error: "triage_failed", message: "Couldn't sort your inbox right now." }, { status: 502 });
  }
}
