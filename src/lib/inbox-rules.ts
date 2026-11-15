// src/lib/inbox-rules.ts
//
// Built-in inbox sorting: no AI, no outside service. Works from what Gmail
// already knows (its Promotions/Updates/Social tabs, the Important flag,
// mailing-list headers) plus Vyris's own data (contacts, projects, your
// mailbox domain) and the words in the subject and preview, in English and
// Arabic. The AI, when it's available, only refines this; when it isn't,
// these results are what the user sees. Pure and client-safe.

import type { Category, Priority, TriageResult } from "./inbox-ai";
import { PERSONAL_DOMAINS, matchProjects } from "./meeting-brief";
import { addressOf, isAutomatedSender } from "./unanswered";

export interface RuleEmail {
  id: string;
  /** Raw From header: "Omar Hassan <omar@acme.co>". */
  fromEmail: string;
  subject: string;
  snippet: string;
  unread: boolean;
  labels: string[];
  bulk: boolean;
}

export interface RuleContext {
  /** The user's own address, for "same company" detection. */
  mailbox: string | null;
  contactEmails: Set<string>;
  projects: { id: string; title: string }[];
}

// Wording that means "today, not next week". Subject and preview only.
const URGENT = [
  /\burgent\b/i,
  /\basap\b/i,
  /\bimmediately\b/i,
  /\b(by|before) (today|tonight|tomorrow|eod|end of (the )?day)\b/i,
  /\beod\b/i,
  /\bdeadline\b/i,
  /\boverdue\b/i,
  /\bfinal (notice|reminder)\b/i,
  /\btime[- ]sensitive\b/i,
  /عاجل/,
  /ضروري/,
  /حالا|حالاً|فورا|فوراً/,
];

// Someone is asking the user for something.
const ASKS = [
  /\?|؟/,
  /\b(can|could|would|will) you\b/i,
  /\bplease\b(?! find)/i,
  /\blet me know\b/i,
  /\b(are|r) you (free|available|around)\b/i,
  /\b(confirm|approve|review|sign|send me|get back to me)\b/i,
  /\bwhat do you think\b/i,
  /\bthoughts\b/i,
  /ممكن|لو سمحت|من فضلك|رجاء|ياريت|يا ريت|محتاج|عايز|عاوز/,
  // \b doesn't see Arabic letters as word characters, so match spaces instead.
  /(^|\s)هل(\s|$)/,
];

// Automated mail that still needs a human today.
const ALERT_URGENT = [
  /\b(payment|charge|card) (failed|declined|was declined)\b/i,
  /\b(security alert|suspicious|unusual sign[- ]in|new sign[- ]in)\b/i,
  /\b(account (suspended|locked|will be (closed|suspended)))\b/i,
  /\b(action required|verify your)\b/i,
];
const ALERT_WORK = /\b(invoice|receipt|payment|payout|order|contract|signed|docusign|calendar|invitation|meeting)\b/i;

const PROMO_WORDS = /\b(\d+% off|sale|discount|deal|offer|webinar|newsletter|unsubscribe|limited time|free trial|black friday|cyber monday)\b/i;

const domainOf = (address: string) => address.split("@")[1]?.toLowerCase() ?? "";
const has = (labels: string[], l: string) => labels.includes(l);
const result = (priority: Priority, category: Category, reason: string, projectId: string | null = null): TriageResult => ({
  priority,
  category,
  reason,
  projectId,
});

/** The first rule that matches, quoted, for the "why" line: Says "ASAP". */
function firstHit(patterns: RegExp[], text: string): string | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

export function triageByRules(email: RuleEmail, ctx: RuleContext): TriageResult {
  const address = addressOf(email.fromEmail);
  const domain = domainOf(address);
  const text = `${email.subject}\n${email.snippet}`;
  const isContact = ctx.contactEmails.has(address);
  const sameCompany = Boolean(
    ctx.mailbox && domain && domain === domainOf(ctx.mailbox.toLowerCase()) && !PERSONAL_DOMAINS.has(domain)
  );
  const automated = isAutomatedSender(email.fromEmail);
  const labels = email.labels;

  // Project: its name in the subject or preview, or the sender's company name in it.
  const company = domain && !PERSONAL_DOMAINS.has(domain) ? domain.split(".")[0] : null;
  const project = matchProjects(ctx.projects, text, company ? [company] : [])[0] ?? null;
  const projectId = project?.id ?? null;

  // 1. Mail that needs a human even though a machine sent it.
  const alert = firstHit(ALERT_URGENT, text);
  if (alert && (automated || email.bulk)) return result("urgent", "work", `Account alert: "${alert}"`);

  // 2. Newsletters and promotions. People you know are never filed here.
  if (!isContact && !sameCompany) {
    if (has(labels, "CATEGORY_PROMOTIONS")) return result("low", "promotions", "Gmail files this under Promotions");
    if (email.bulk && PROMO_WORDS.test(text)) return result("low", "promotions", "Newsletter or offer");
  }

  // 3. Other automated mail: receipts, invoices, notifications.
  if (automated || email.bulk || has(labels, "CATEGORY_UPDATES") || has(labels, "CATEGORY_SOCIAL") || has(labels, "CATEGORY_FORUMS")) {
    if (!isContact && !sameCompany) {
      if (ALERT_WORK.test(text)) return result("fyi", "work", "Automated: receipt, invoice or calendar", projectId);
      if (has(labels, "CATEGORY_SOCIAL")) return result("low", "promotions", "Social network notification");
      return result("low", "promotions", email.bulk ? "Mailing list" : "Automated notification");
    }
  }

  // 4. A person. Work if you know them, they're at your company, a project
  // matches, or they write from a business domain.
  const category: Category =
    isContact || sameCompany || projectId || (domain && !PERSONAL_DOMAINS.has(domain)) ? "work" : "personal";
  const who = isContact ? "A contact" : sameCompany ? "Someone at your company" : category === "work" ? "A work sender" : "A personal sender";

  const urgent = firstHit(URGENT, text);
  if (urgent) return result("urgent", category, `Says "${urgent.trim()}"`, projectId);

  const ask = firstHit(ASKS, text);
  if (ask) return result("needs_reply", category, `${who} is asking you something`, projectId);

  // Gmail's Important flag on a person you know, still unread: likely waiting on you.
  if (has(labels, "IMPORTANT") && email.unread && (isContact || sameCompany || projectId)) {
    return result("needs_reply", category, `${who}, marked important by Gmail`, projectId);
  }

  return result("fyi", category, project ? `About ${project.title}` : `${who}, no question asked`, projectId);
}

export function triageAllByRules(emails: RuleEmail[], ctx: RuleContext): Record<string, TriageResult> {
  return Object.fromEntries(emails.map((e) => [e.id, triageByRules(e, ctx)]));
}
