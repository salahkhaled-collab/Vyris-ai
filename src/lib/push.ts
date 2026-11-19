// src/lib/push.ts
//
// Web Push for the morning reminder: what the notification says, and which
// subscriptions we accept. Pure and client-safe; sending is in push-server.ts.
//
// The browser gives us an "endpoint" URL and the server POSTs to it. Only the
// browser push services are accepted, so nobody can make Vyris's server send
// requests to an address of their choosing.

import type { MorningBrief } from "./morning-brief";

/** Push services of Chrome/Android/Edge, Firefox, Safari/iOS and Windows. */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

export function isAllowedEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && !u.port && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** The JSON a browser's PushSubscription.toJSON() gives, checked. */
export function validateSubscription(raw: unknown): { ok: true; value: PushSubscriptionInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Send the browser's subscription." };
  const o = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const endpoint = typeof o.endpoint === "string" ? o.endpoint.trim() : "";
  if (!endpoint || endpoint.length > 1000 || !isAllowedEndpoint(endpoint)) return { ok: false, error: "This browser's push service isn't supported." };
  const p256dh = typeof o.keys?.p256dh === "string" ? o.keys.p256dh : "";
  const auth = typeof o.keys?.auth === "string" ? o.keys.auth : "";
  if (!B64URL.test(p256dh) || p256dh.length > 200 || !B64URL.test(auth) || auth.length > 100) {
    return { ok: false, error: "The subscription keys are missing." };
  }
  return { ok: true, value: { endpoint, p256dh, auth } };
}

/** "Chrome on Android" style label, so a user can tell their devices apart. */
export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return os ? `${browser} on ${os}` : browser;
}

export interface PushPayload {
  title: string;
  body: string;
  /** App path opened when the notification is tapped. */
  url: string;
  /** Same tag replaces yesterday's notification instead of stacking. */
  tag: string;
}

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

function timeIn(iso: string, timeZone: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  } catch {
    return "";
  }
}

/** The morning notification: a short "don't forget" for today, from the same brief as the email. */
export function morningPush(brief: MorningBrief, timeZone: string): PushPayload {
  const base = { url: "/dashboard", tag: "vyris-morning" };
  if (brief.allClear) return { ...base, title: "A clear day ahead", body: "Nothing urgent, nothing late. Open Vyris to plan your focus." };

  const meetings = (brief.meetings ?? []).filter((m) => !m.allDay);
  const parts = brief.focus.map((f) => f.title);
  if (meetings.length > 0) {
    const first = meetings[0];
    const at = timeIn(first.start, timeZone);
    parts.push(meetings.length === 1 ? `Meeting${at ? ` at ${at}` : ""}: ${first.title}` : `${meetings.length} meetings, first${at ? ` at ${at}` : ""}`);
  }
  const waiting = (brief.unanswered ?? []).length;
  if (waiting > 0 && !brief.focus.some((f) => f.kind === "reply")) parts.push(`${waiting} ${waiting === 1 ? "person is" : "people are"} waiting on your reply`);

  const n = brief.focus.length;
  const title = n > 0 ? `Don't forget: ${n} thing${n === 1 ? "" : "s"} today` : meetings.length > 0 ? "Your day in Vyris" : "Your Vyris brief";
  const body = parts.length > 0 ? parts.join(" · ") : "Open Vyris to see today.";
  return { ...base, title, body: clip(body, 220) };
}
