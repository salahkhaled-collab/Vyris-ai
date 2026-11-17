// src/lib/gmail-labels.ts
//
// Writes Vyris's inbox priorities into the user's own Gmail as labels
// ("Vyris/Urgent", "Vyris/Needs reply", "Vyris/FYI", "Vyris/Low"), so they
// show in the Gmail app too. Only labels are added or removed: nothing is
// archived, deleted, marked read or moved. Needs the gmail.modify scope,
// which is asked for only when the user turns labels on.

import { GMAIL, GMAIL_TIMEOUT_MS, GmailError } from "@/lib/gmail";
import { PRIORITIES, type Priority } from "@/lib/inbox-ai";

export const LABEL_PREFIX = "Vyris";

export const LABEL_NAMES: Record<Priority, string> = {
  urgent: `${LABEL_PREFIX}/Urgent`,
  needs_reply: `${LABEL_PREFIX}/Needs reply`,
  fyi: `${LABEL_PREFIX}/FYI`,
  low: `${LABEL_PREFIX}/Low`,
};

// Colors from Gmail's fixed label palette (other values are rejected).
const LABEL_COLORS: Record<Priority, { backgroundColor: string; textColor: string }> = {
  urgent: { backgroundColor: "#fb4c2f", textColor: "#ffffff" },
  needs_reply: { backgroundColor: "#ffad47", textColor: "#000000" },
  fyi: { backgroundColor: "#4a86e8", textColor: "#ffffff" },
  low: { backgroundColor: "#cccccc", textColor: "#000000" },
};

/** Gmail message ids are hex; anything else is refused before calling Gmail. */
export const MESSAGE_ID = /^[A-Za-z0-9_-]{6,64}$/;
export const MAX_ASSIGNMENTS = 100;

export interface Assignment {
  id: string;
  priority: Priority;
}

/** Validates client input: known priorities, safe ids, each message once (last wins). */
export function parseAssignments(raw: unknown): Assignment[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ASSIGNMENTS) return null;
  const byId = new Map<string, Priority>();
  for (const item of raw) {
    const o = item as { id?: unknown; priority?: unknown } | null;
    if (!o || typeof o.id !== "string" || !MESSAGE_ID.test(o.id)) return null;
    if (typeof o.priority !== "string" || !(PRIORITIES as readonly string[]).includes(o.priority)) return null;
    byId.set(o.id, o.priority as Priority);
  }
  return Array.from(byId, ([id, priority]) => ({ id, priority }));
}

async function gmailJson<T>(token: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${GMAIL}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(GMAIL_TIMEOUT_MS),
  });
  if (!res.ok) {
    console.error("Gmail labels API error:", res.status, await res.text().catch(() => ""));
    throw new GmailError(res.status, "Could not update Gmail labels.");
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

/** The Vyris label ids, creating any that are missing. */
export async function ensureLabels(token: string): Promise<Record<Priority, string>> {
  const { labels = [] } = await gmailJson<{ labels?: { id: string; name: string }[] }>(token, "/labels");
  const byName = new Map(labels.map((l) => [l.name, l.id]));
  const out = {} as Record<Priority, string>;
  for (const p of PRIORITIES) {
    const name = LABEL_NAMES[p];
    const existing = byName.get(name);
    if (existing) {
      out[p] = existing;
      continue;
    }
    const base = { name, labelListVisibility: "labelShow", messageListVisibility: "show" };
    let created: { id: string };
    try {
      created = await gmailJson<{ id: string }>(token, "/labels", { method: "POST", body: { ...base, color: LABEL_COLORS[p] } });
    } catch (err) {
      // A rejected color must not block the label itself.
      if (err instanceof GmailError && err.status === 400) {
        created = await gmailJson<{ id: string }>(token, "/labels", { method: "POST", body: base });
      } else throw err;
    }
    out[p] = created.id;
  }
  return out;
}

/**
 * Gives each message exactly one Vyris label: adds its priority's label and
 * removes the other three. One batchModify call per priority.
 */
export async function applyPriorityLabels(token: string, assignments: Assignment[]): Promise<{ applied: number }> {
  const ids = await ensureLabels(token);
  let applied = 0;
  for (const p of PRIORITIES) {
    const messageIds = assignments.filter((a) => a.priority === p).map((a) => a.id);
    if (messageIds.length === 0) continue;
    await gmailJson(token, "/messages/batchModify", {
      method: "POST",
      body: {
        ids: messageIds,
        addLabelIds: [ids[p]],
        removeLabelIds: PRIORITIES.filter((q) => q !== p).map((q) => ids[q]),
      },
    });
    applied += messageIds.length;
  }
  return { applied };
}
