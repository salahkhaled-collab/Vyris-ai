import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { deviceLabel, validateSubscription } from "@/lib/push";
import { pushPublicKey } from "@/lib/push-server";
import { consume, HOUR } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_DEVICES = 10;

/** GET /api/push: whether notifications are available, the app's public key, and this user's devices. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const devices = await prisma.pushSubscription.findMany({
    where: { userId: session.user.id },
    select: { endpoint: true, device: true, createdAt: true, lastSentAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ publicKey: pushPublicKey(), devices });
}

/** POST /api/push: turn on notifications for this browser. Body: the browser's PushSubscription JSON. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  if (!pushPublicKey()) return NextResponse.json({ error: "not_configured", message: "Notifications aren't set up yet." }, { status: 503 });
  if (!(await consume(`push-sub:${session.user.id}`, 20, HOUR))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as unknown;
  const v = validateSubscription(body);
  if (!v.ok) return NextResponse.json({ error: "invalid", message: v.error }, { status: 400 });
  const userId = session.user.id;
  const count = await prisma.pushSubscription.count({ where: { userId, NOT: { endpoint: v.value.endpoint } } });
  if (count >= MAX_DEVICES) {
    return NextResponse.json({ error: "too_many", message: `Notifications are on for ${MAX_DEVICES} devices already. Turn one off in Settings.` }, { status: 409 });
  }
  const device = deviceLabel(req.headers.get("user-agent")).slice(0, 60);
  // A device belongs to whoever signed in on it last.
  await prisma.pushSubscription.upsert({
    where: { endpoint: v.value.endpoint },
    create: { userId, ...v.value, device },
    update: { userId, p256dh: v.value.p256dh, auth: v.value.auth, device },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/push: turn off notifications for one device. Body: { endpoint }. */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { endpoint?: unknown };
  if (typeof body.endpoint !== "string") return NextResponse.json({ error: "invalid" }, { status: 400 });
  // Only this user's own device; someone else's endpoint is silently untouched.
  await prisma.pushSubscription.deleteMany({ where: { userId: session.user.id, endpoint: body.endpoint } });
  return NextResponse.json({ ok: true });
}
