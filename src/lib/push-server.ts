// src/lib/push-server.ts
//
// Sends Web Push notifications. Needs VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
// (one key pair for the whole app, made once with web-push's generator) and
// optionally VAPID_SUBJECT (a mailto: or https: contact for the push services).
// Without the keys, notifications are simply off: nothing else breaks.

import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { loadBrief } from "@/lib/morning-brief-server";
import { morningPush, type PushPayload } from "@/lib/push";
import { SITE_URL } from "@/lib/site-url";

export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY ? process.env.VAPID_PUBLIC_KEY : null;
}

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  const subject = process.env.VAPID_SUBJECT || (SITE_URL.startsWith("https://") ? SITE_URL : "https://vyris.vercel.app");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export interface SendResult {
  sent: number;
  removed: number;
  failed: number;
}

/** Sends to every device the user turned notifications on for. Gone devices (404/410) are removed. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<SendResult> {
  const result: SendResult = { sent: 0, removed: 0, failed: 0 };
  if (!configure()) return result;
  const subs = await prisma.pushSubscription.findMany({ where: { userId }, select: { id: true, endpoint: true, p256dh: true, auth: true }, take: 20 });
  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 6 * 3600, urgency: "normal", timeout: 10_000 });
        result.sent += 1;
        await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastSentAt: new Date() } }).catch(() => {});
      } catch (err: unknown) {
        const status = typeof err === "object" && err !== null && "statusCode" in err ? Number((err as { statusCode: unknown }).statusCode) : 0;
        if (status === 404 || status === 410) {
          result.removed += 1;
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          result.failed += 1;
          console.error(`[push] send failed (${status || "network"}) for subscription ${s.id}`);
        }
      }
    })
  );
  return result;
}

/** Today's reminder for one user, from the same brief as the morning email. */
export async function sendMorningPush(userId: string, now: Date): Promise<SendResult> {
  const { brief, timeZone } = await loadBrief(userId, now, { withInbox: true });
  return sendToUser(userId, morningPush(brief, timeZone));
}

/** Called by the daily cron: everyone with notifications on gets today's reminder, until the deadline. */
export async function sendMorningPushes(now: Date, deadline: number): Promise<{ users: number; sent: number; notReached: number }> {
  if (!configure()) return { users: 0, sent: 0, notReached: 0 };
  const rows = await prisma.pushSubscription.findMany({ distinct: ["userId"], select: { userId: true }, take: 2000 });
  let next = 0;
  let sent = 0;
  let notReached = 0;
  async function worker() {
    while (next < rows.length) {
      if (Date.now() > deadline) {
        notReached = rows.length - next;
        next = rows.length;
        return;
      }
      const { userId } = rows[next++];
      try {
        sent += (await sendMorningPush(userId, now)).sent;
      } catch (err) {
        console.error(`[push] morning reminder failed for a user:`, err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, rows.length) }, () => worker()));
  return { users: rows.length, sent, notReached };
}
