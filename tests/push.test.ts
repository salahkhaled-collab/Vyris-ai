// Morning notifications: what they say, which subscriptions are accepted, real encryption, and cleanup of dead devices.
import assert from "node:assert/strict";
import crypto from "node:crypto";
let me: any = { id: "u1", email: "u1@x.co" };
const naPath = require.resolve("next-auth");
require.cache[naPath] = { id: naPath, filename: naPath, loaded: true, exports: { getServerSession: async () => (me ? { user: me } : null) } } as unknown as NodeModule;
const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }

(async () => {
  console.error = () => {};
  const P = require("@/lib/push");
  const { buildBrief } = require("@/lib/morning-brief");
  const empty = { overdue: [], blocked: [], dueSoon: [], idleProjects: [], total: 0 };
  const now = new Date("2026-11-20T05:00:00Z");
  const brief = (o: any) => buildBrief({ report: empty, meetings: [], unanswered: [], changes: [], goals: [], commitments: [], now, timeZone: "Africa/Cairo", ...o });

  await check("busy day: 'Don't forget: N things today', the items, the first meeting in local time", () => {
    const b = brief({
      report: { ...empty, overdue: [{ taskId: "t", projectId: "p", dueDate: null, title: "Invoice", projectTitle: "Atlas", daysOverdue: 2 }] },
      unanswered: [{ threadId: "x", from: "Omar", subject: "Quote", daysWaiting: 5 }],
      meetings: [{ title: "Atlas review", start: "2026-11-20T09:30:00Z", allDay: false, attendees: ["s@a.com"], project: null }, { title: "Standup", start: "2026-11-20T12:00:00Z", allDay: false, attendees: [], project: null }],
    });
    const p = P.morningPush(b, "Africa/Cairo");
    assert.match(p.title, /^Don't forget: \d things? today$/);
    assert.match(p.body, /Invoice/); assert.match(p.body, /Omar/); assert.match(p.body, /2 meetings, first at 11:30 AM/);
    assert.equal(p.url, "/dashboard"); assert.equal(p.tag, "vyris-morning", "replaces yesterday's instead of stacking");
  });
  await check("clear day says so; long bodies are cut to fit a notification", () => {
    assert.equal(P.morningPush(brief({}), "UTC").title, "A clear day ahead");
    const many = brief({ report: { ...empty, overdue: [1, 2, 3].map((n) => ({ taskId: "t" + n, projectId: "p", dueDate: null, title: "A very long task name that keeps going and going ".repeat(2) + n, projectTitle: "P", daysOverdue: n })) } });
    assert.ok(P.morningPush(many, "UTC").body.length <= 220);
  });
  await check("only real push services are accepted (no sending to arbitrary servers)", () => {
    for (const ok of ["https://fcm.googleapis.com/fcm/send/abc", "https://updates.push.services.mozilla.com/wpush/v2/x", "https://web.push.apple.com/Q", "https://wns2-db5p.notify.windows.com/w/?token=x"]) assert.ok(P.isAllowedEndpoint(ok), ok);
    for (const bad of ["http://fcm.googleapis.com/x", "https://evil.com/fcm.googleapis.com", "https://fcm.googleapis.com.evil.com/x", "https://fcm.googleapis.com:8443/x", "https://169.254.169.254/latest", "not a url"]) assert.ok(!P.isAllowedEndpoint(bad), bad);
  });
  await check("device names", () => {
    assert.equal(P.deviceLabel("Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/131.0 Mobile Safari/537.36"), "Chrome on Android");
    assert.equal(P.deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) AppleWebKit Version/17.5 Mobile/15E148 Safari/604.1"), "Safari on iPhone");
    assert.equal(P.deviceLabel("Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/131 Safari/537 Edg/131"), "Edge on Windows");
  });

  // A real subscriber key pair, like a browser makes.
  const ecdh = crypto.createECDH("prime256v1"); ecdh.generateKeys();
  const authSecret = crypto.randomBytes(16);
  const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/device-1", keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: authSecret.toString("base64url") } };
  await check("subscription validation", () => {
    assert.equal(P.validateSubscription(sub).ok, true);
    assert.equal(P.validateSubscription({ ...sub, endpoint: "https://evil.com/x" }).ok, false);
    assert.equal(P.validateSubscription({ endpoint: sub.endpoint, keys: {} }).ok, false);
  });

  const webpush = require("web-push");
  const vapid = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapid.publicKey; process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
  await check("real encryption: the payload decrypts on the device into the notification JSON", () => {
    webpush.setVapidDetails("https://vyris.vercel.app", vapid.publicKey, vapid.privateKey);
    const payload = JSON.stringify(P.morningPush(brief({}), "UTC"));
    const req = webpush.generateRequestDetails(sub, payload, { TTL: 60 });
    assert.equal(req.headers["Content-Encoding"], "aes128gcm"); assert.match(req.headers.Authorization, /^vapid t=.+, k=/);
    const ece = require("http_ece");
    const plain = ece.decrypt(req.body, { version: "aes128gcm", privateKey: ecdh, authSecret: authSecret });
    assert.deepEqual(JSON.parse(plain.toString()), JSON.parse(payload));
  });

  // Sending: success records lastSentAt; 410 removes the device; other errors keep it.
  const { prisma } = require("@/lib/prisma");
  const Dp = (n: string, v: any) => Object.defineProperty(prisma, n, { value: v, configurable: true, writable: true });
  let rows: any[] = [];
  const log: string[] = [];
  Dp("pushSubscription", {
    findMany: async (x: any) => (x.distinct ? [...new Set(rows.map((r) => r.userId))].map((userId) => ({ userId })) : rows.filter((r) => !x.where || r.userId === x.where.userId)),
    findFirst: async () => null,
    update: async (x: any) => { log.push("update " + x.where.id); return {}; },
    delete: async (x: any) => { log.push("delete " + x.where.id); rows = rows.filter((r) => r.id !== x.where.id); return {}; },
    deleteMany: async (x: any) => { log.push("deleteMany " + JSON.stringify(x.where)); return { count: 1 }; },
    count: async () => rows.length,
    upsert: async (x: any) => { log.push("upsert " + JSON.stringify(x.where)); return {}; },
  });
  const sendCalls: any[] = [];
  webpush.sendNotification = async (s: any, body: string) => {
    sendCalls.push({ endpoint: s.endpoint, body });
    if (s.endpoint.endsWith("gone")) { const e: any = new Error("gone"); e.statusCode = 410; throw e; }
    if (s.endpoint.endsWith("flaky")) { const e: any = new Error("500"); e.statusCode = 500; throw e; }
    return { statusCode: 201 };
  };
  const serverPath = require.resolve("@/lib/morning-brief-server");
  require.cache[serverPath] = { id: serverPath, filename: serverPath, loaded: true, exports: { loadBrief: async () => ({ brief: brief({}), timeZone: "UTC", inbox: "ok" }) } } as unknown as NodeModule;
  const S = require("@/lib/push-server");
  rows = [
    { id: "s1", userId: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/ok", p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    { id: "s2", userId: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/gone", p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    { id: "s3", userId: "u2", endpoint: "https://fcm.googleapis.com/fcm/send/flaky", p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  ];
  await check("daily send: every user once; dead devices removed; flaky ones kept", async () => {
    const r = await S.sendMorningPushes(now, Date.now() + 10_000);
    assert.deepEqual(r, { users: 2, sent: 1, notReached: 0 });
    assert.ok(log.includes("update s1") && log.includes("delete s2") && !log.includes("delete s3"));
    assert.equal(JSON.parse(sendCalls[0].body).title, "A clear day ahead");
  });
  await check("daily send stops at the deadline and says how many it didn't reach", async () => {
    const r = await S.sendMorningPushes(now, Date.now() - 1);
    assert.equal(r.sent, 0); assert.equal(r.notReached, r.users);
  });

  const api = require("@/app/api/push/route");
  const testApi = require("@/app/api/push/test/route");
  const post = (body: any, ua = "Mozilla/5.0 (Linux; Android 14) Chrome/131.0 Mobile") => ({ json: async () => body, headers: new Headers({ "user-agent": ua }) }) as any;
  await check("subscribe: needs a session, rejects non-push endpoints, saves with a device name", async () => {
    me = null; assert.equal((await api.POST(post(sub))).status, 401); me = { id: "u1", email: "u1@x.co" };
    assert.equal((await api.POST(post({ ...sub, endpoint: "https://169.254.169.254/x" }))).status, 400);
    rows = []; log.length = 0;
    assert.equal((await api.POST(post(sub))).status, 201);
    assert.ok(log.some((l) => l.startsWith("upsert") && l.includes("device-1")));
  });
  await check("unsubscribe only touches the signed-in user's device", async () => {
    log.length = 0; await api.DELETE(post({ endpoint: sub.endpoint }));
    assert.deepEqual(JSON.parse(log[0].replace("deleteMany ", "")), { userId: "u1", endpoint: sub.endpoint });
  });
  await check("test send: 502 when no device was reached (never claims sent)", async () => {
    rows = []; assert.equal((await testApi.POST()).status, 502);
    rows = [{ id: "s9", userId: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/ok", p256dh: sub.keys.p256dh, auth: sub.keys.auth }];
    assert.equal((await testApi.POST()).status, 200);
  });
  await check("no keys configured: subscribe says not set up (503), nothing breaks", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    assert.equal((await api.POST(post(sub))).status, 503);
    const g = await api.GET(); assert.equal((await g.json()).publicKey, null);
  });

  console.log(results.join("\n")); console.log(fails ? `push-test: ${fails} FAILED` : "push-test: all passed"); process.exit(fails ? 1 : 0);
})();
