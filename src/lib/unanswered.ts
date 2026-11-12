// "Who is waiting on a reply from me?": inbox threads where the latest
// message is from someone else, a person rather than a mailer, and has sat
// for at least two days. Feeds the daily digest. The pure rule is separate
// from the Gmail calls so it can be tested.

export interface ThreadLastMessage {
  threadId: string;
  /** Raw From header of the newest message in the thread. */
  from: string;
  subject: string;
  /** When the newest message arrived. */
  at: Date;
}

export interface Unanswered {
  threadId: string;
  from: string;
  subject: string;
  daysWaiting: number;
}

export const MIN_DAYS_WAITING = 2;
export const MAX_DAYS_WAITING = 14;

/** Mailers: "noreply", "no-reply-abc", "mailer-daemon"... */
const NO_REPLY = /^(no-?reply|do-?not-?reply|mailer-daemon|postmaster)/;
/** Role inboxes that send in bulk. Exact local part only, so "sara.news@" is a person. */
const ROLE = /^(notifications?|notify|newsletters?|news|updates?|alerts?|billing|receipts?|support|info|marketing)@/;

/** The bare address inside a From header, lowercased. */
export function addressOf(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

export function isAutomatedSender(from: string): boolean {
  const address = addressOf(from);
  return NO_REPLY.test(address) || ROLE.test(address);
}

/** Display name from a From header, falling back to the address. */
export function nameOf(from: string): string {
  const name = from.replace(/<[^>]*>/, "").replace(/"/g, "").trim();
  return name || addressOf(from);
}

export function pickUnanswered(threads: ThreadLastMessage[], myAddress: string, now: Date): Unanswered[] {
  const me = myAddress.toLowerCase();
  return threads
    .filter((t) => addressOf(t.from) !== me && !isAutomatedSender(t.from))
    .map((t) => ({
      threadId: t.threadId,
      from: nameOf(t.from),
      subject: t.subject || "(No subject)",
      daysWaiting: Math.floor((now.getTime() - t.at.getTime()) / 86_400_000),
    }))
    .filter((u) => u.daysWaiting >= MIN_DAYS_WAITING && u.daysWaiting <= MAX_DAYS_WAITING)
    .sort((a, b) => b.daysWaiting - a.daysWaiting);
}
