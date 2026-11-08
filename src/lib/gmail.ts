// src/lib/gmail.ts
//
// Shared Gmail helpers for every route that talks to the Gmail API: header and
// body parsing, inbox listing, thread loading, and building outgoing messages.
// Server-only. Callers pass a Google access token from getGoogleAccessToken.

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: GmailHeader[];
}

export interface InboxMessage {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  unread: boolean;
  timestamp: string;
}

export interface ThreadMessage {
  id: string;
  from: string;
  date: string;
  /** RFC 822 Message-ID header, for threading replies. */
  messageIdHeader: string;
  text: string;
}

export interface GmailThread {
  threadId: string;
  subject: string;
  messages: ThreadMessage[];
}

export class GmailError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export function parseFromName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : from.split("<")[0].trim() || from;
}

export function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

export function extractBody(payload: GmailPart | undefined): { html: string | null; text: string } {
  if (!payload) return { html: null, text: "" };
  const stack: GmailPart[] = [payload];
  let html = "";
  let text = "";
  while (stack.length > 0) {
    const part = stack.pop()!;
    if (part.mimeType === "text/html" && part.body?.data && !html) html = decodeBase64Url(part.body.data);
    if (part.mimeType === "text/plain" && part.body?.data && !text) text = decodeBase64Url(part.body.data);
    if (part.parts) stack.push(...part.parts);
  }
  return { html: html || null, text };
}

/** Gmail snippets arrive HTML-escaped ("Children&#39;s"); turn entities back into text. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Rough HTML to text for feeding the model (never rendered). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Drop quoted history ("On ... wrote:" and "> " lines) so each message is just what was new. */
export function stripQuoted(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (/^On .+wrote:\s*$/i.test(line.trim())) break;
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(line.trim())) break;
    if (line.trim().startsWith(">")) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

async function gmailFetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${GMAIL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("Gmail API error:", res.status, await res.text().catch(() => ""));
    throw new GmailError(res.status, res.status === 404 ? "Email not found." : "Could not reach Gmail.");
  }
  return (await res.json()) as T;
}

interface GmailMessageMeta {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: { headers?: GmailHeader[] };
}

export async function listInbox(token: string, max = 15): Promise<InboxMessage[]> {
  return searchMessages(token, "in:inbox", max, "INBOX");
}

/** Messages matching a Gmail search query (metadata only), newest first. */
export async function searchMessages(token: string, q: string, max = 10, labelId?: string): Promise<InboxMessage[]> {
  const params = new URLSearchParams({ maxResults: String(max), q });
  if (labelId) params.set("labelIds", labelId);
  const list = await gmailFetch<{ messages?: { id: string }[] }>(token, `/messages?${params.toString()}`);
  const ids = (list.messages ?? []).map((m) => m.id);
  if (ids.length === 0) return [];

  const meta = new URLSearchParams({ format: "metadata" });
  ["From", "Subject", "Date"].forEach((h) => meta.append("metadataHeaders", h));

  const messages = await Promise.all(
    ids.map((id) =>
      gmailFetch<GmailMessageMeta>(token, `/messages/${encodeURIComponent(id)}?${meta.toString()}`).catch(() => null)
    )
  );

  return messages
    .filter((m): m is GmailMessageMeta => m !== null)
    .map((m) => {
      const headers = m.payload?.headers;
      const from = getHeader(headers, "From");
      return {
        id: m.id,
        threadId: m.threadId,
        from: parseFromName(from),
        fromEmail: from,
        subject: getHeader(headers, "Subject") || "(No subject)",
        snippet: decodeEntities(m.snippet ?? ""),
        unread: m.labelIds?.includes("UNREAD") ?? false,
        timestamp: new Date(m.internalDate ? parseInt(m.internalDate, 10) : Date.now()).toISOString(),
      };
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const MAX_MESSAGE_CHARS = 4_000;

/** Load the whole thread a message belongs to, as plain text, oldest first. */
export async function getThreadForMessage(token: string, messageId: string): Promise<GmailThread> {
  const msg = await gmailFetch<{ threadId: string }>(
    token,
    `/messages/${encodeURIComponent(messageId)}?format=minimal`
  );
  const thread = await gmailFetch<{ id: string; messages?: { id: string; payload?: GmailPart }[] }>(
    token,
    `/threads/${encodeURIComponent(msg.threadId)}?format=full`
  );
  const messages = (thread.messages ?? []).map((m) => {
    const headers = m.payload?.headers;
    const { html, text } = extractBody(m.payload);
    const plain = stripQuoted(text || (html ? htmlToText(html) : ""));
    return {
      id: m.id,
      from: getHeader(headers, "From"),
      date: getHeader(headers, "Date"),
      messageIdHeader: getHeader(headers, "Message-ID") || getHeader(headers, "Message-Id"),
      text: plain.slice(0, MAX_MESSAGE_CHARS),
    };
  });
  const first = thread.messages?.[0]?.payload?.headers;
  return { threadId: thread.id, subject: getHeader(first, "Subject") || "(No subject)", messages };
}

/** The connected Gmail address. It can differ from the Vyris login email. */
export async function getMailboxAddress(token: string): Promise<string | null> {
  try {
    const profile = await gmailFetch<{ emailAddress?: string }>(token, "/profile");
    return profile.emailAddress?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

// ── Outgoing mail ──────────────────────────────────────────────────────────

/** Header values may never contain line breaks; one injected CRLF could add a hidden Bcc. */
export function safeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** RFC 2047 encode non-ASCII header text (e.g. Arabic subjects). */
export function encodeHeaderWord(value: string): string {
  const safe = safeHeaderValue(value);
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(safe) ? safe : `=?UTF-8?B?${Buffer.from(safe, "utf-8").toString("base64")}?=`;
}

const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

/** Accept "a@b.com" or "Name <a@b.com>"; return the bare address, or null if invalid. */
export function parseRecipient(value: string): string | null {
  const v = safeHeaderValue(value);
  const angle = /<([^<>]+)>\s*$/.exec(v);
  const address = (angle ? angle[1] : v).trim();
  return EMAIL_RE.test(address) ? address : null;
}

export function buildRawMessage(input: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
}): string {
  const headers = [
    `To: ${input.to}`,
    `Subject: ${encodeHeaderWord(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
  ];
  const ref = input.inReplyTo ? safeHeaderValue(input.inReplyTo) : "";
  if (ref) headers.push(`In-Reply-To: ${ref}`, `References: ${ref}`);
  const message = [...headers, "", input.body].join("\r\n");
  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
