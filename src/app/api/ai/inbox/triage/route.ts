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
  rateLimitWait,
  triagePrompt,
  triageUserMessage,
  type TriageResult,
} from "@/lib/inbox-ai";
import { triageAllByRules } from "@/lib/inbox-rules";

export const maxDuration = 60;

/**
 * POST /api/ai/inbox/triage { knownIds?: string[] } — classify the latest inbox
 * emails, skipping ids the client already has results for. Read-only.
 *
 * Built-in rules (src/lib/inbox-rules.ts) sort every email first. The AI, when
 * configured and within its limits, refines those results; if it's missing,
 * rate-limited, slow or returns junk, the rule results are returned instead of
 * an error. `source` says which one sorted: "ai", "rules" or "mixed".
 */
export async function POST(req: NextRequest) {
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
      return NextResponse.json({
        results: automated,
        projects: Object.fromEntries(projects.map((p) => [p.id, p.title])),
        source: "rules",
        notice: null,
      });
    }

    // Anyone in the user's Contacts is always work.
    const contactEmails = new Set(
      contacts.map((c) => c.email?.trim().toLowerCase()).filter((e): e is string => Boolean(e))
    );
    const projectNames = Object.fromEntries(projects.map((p) => [p.id, p.title]));
    const rules = triageAllByRules(emails, { mailbox, contactEmails, projects });

    // The AI refines the rules when it can. Any failure keeps the rule results.
    let ai: Record<string, TriageResult> | null = null;
    let notice: string | null = null;
    if (pythonLlmConfigured()) {
      try {
        const completion = await completeWithPythonLlm({
          system: triagePrompt(projects, user?.name ?? null),
          messages: [{ role: "user", content: triageUserMessage(emails) }],
          maxTokens: 2000,
          timeoutMs: 25_000,
        });
        const parsed = parseTriage(
          completion.text,
          emails.map((e) => e.id),
          projects.map((p) => p.id)
        );
        if (parsed) {
          ai = applyContactOverride(
            parsed,
            Object.fromEntries(emails.map((e) => [e.id, parseRecipient(e.fromEmail)])),
            contactEmails
          );
        } else {
          console.error("Inbox triage: unparseable reply", { emails: emails.length, chars: completion.text.length });
          notice = "Sorted with Vyris's built-in rules.";
        }
      } catch (err) {
        const wait = rateLimitWait(err);
        if (wait === null) console.error("Inbox triage AI failed, using rules:", err);
        notice =
          wait !== null
            ? `Sorted with Vyris's built-in rules. AI reasons are back in about ${Math.max(1, Math.ceil(wait))}s.`
            : "Sorted with Vyris's built-in rules.";
      }
    }

    const fromAi = ai ? Object.keys(ai).length : 0;
    const results: Record<string, TriageResult> = { ...rules, ...(ai ?? {}), ...automated };
    return NextResponse.json({
      results,
      projects: projectNames,
      source: fromAi === 0 ? "rules" : fromAi === emails.length ? "ai" : "mixed",
      notice,
    });
  } catch (err: unknown) {
    // Only Gmail or the database can fail here now; the AI never does.
    console.error("Inbox triage failed:", err);
    return NextResponse.json({ error: "triage_failed", message: "Couldn't load your inbox to sort it. Try again." }, { status: 502 });
  }
}
