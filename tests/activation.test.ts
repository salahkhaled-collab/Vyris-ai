// First five minutes: one Google screen, safe return paths, "send the brief now", and the first-week funnel.
import assert from "node:assert/strict";
let me: any = { id: "u1", email: "u1@x.co" };
const naPath = require.resolve("next-auth");
let signInCall: any = null;
require.cache[naPath] = { id: naPath, filename: naPath, loaded: true, exports: { getServerSession: async () => (me ? { user: me } : null) } } as unknown as NodeModule;
const nrPath = require.resolve("next-auth/react");
require.cache[nrPath] = { id: nrPath, filename: nrPath, loaded: true, exports: { signIn: async (...a: any[]) => { signInCall = a; } } } as unknown as NodeModule;
const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }
const D = (s: string) => new Date(s);

(async () => {
  console.error = () => {};
  const G = require("@/lib/google-scopes");
  await check("Gmail + Calendar on one Google screen, no duplicate scopes", () => {
    const p = G.connectParams(["gmail", "calendar"]);
    const scopes = p.scope.split(" ");
    assert.equal(new Set(scopes).size, scopes.length);
    assert.ok(G.hasFeatureScopes(p.scope, "gmail") && G.hasFeatureScopes(p.scope, "calendar"));
    assert.equal(p.include_granted_scopes, "true");
    assert.equal(G.connectParams("gmail").scope, G.connectParams(["gmail"]).scope, "single feature unchanged");
  });

  const C = require("@/lib/google-connect");
  (globalThis as any).window = { location: { href: "https://vyris.vercel.app/dashboard" } };
  await check("return path: app paths only; anything else falls back to the current page", () => {
    C.connectGoogle(["gmail", "calendar"], "/inbox?welcome=1"); assert.equal(signInCall[1].callbackUrl, "/inbox?welcome=1");
    C.connectGoogle("gmail", "//evil.com/x"); assert.equal(signInCall[1].callbackUrl, "https://vyris.vercel.app/dashboard");
    C.connectGoogle("gmail", "https://evil.com"); assert.equal(signInCall[1].callbackUrl, "https://vyris.vercel.app/dashboard");
    C.connectGoogle("calendar"); assert.equal(signInCall[1].callbackUrl, "https://vyris.vercel.app/dashboard");
  });
  delete (globalThis as any).window;

  // POST /api/brief/send
  const serverPath = require.resolve("@/lib/morning-brief-server");
  const enginePath = require.resolve("@/lib/automation/engine");
  let sent: any[] = []; let outcome: any = { status: "SUCCESS", detail: "Sent from your Gmail." }; let loadFails = false;
  require.cache[serverPath] = { id: serverPath, filename: serverPath, loaded: true, exports: {
    loadBrief: async (userId: string, _now: Date, opts: any) => {
      if (loadFails) throw new Error("db down");
      assert.equal(opts.withInbox, true);
      const { buildBrief } = require("@/lib/morning-brief");
      return { brief: buildBrief({ report: { overdue: [], blocked: [], dueSoon: [], idleProjects: [], total: 0 }, meetings: [], unanswered: [], changes: [], goals: [], commitments: [], now: new Date(), timeZone: "UTC" }), timeZone: "UTC", inbox: "ok", userId };
    } } } as unknown as NodeModule;
  require.cache[enginePath] = { id: enginePath, filename: enginePath, loaded: true, exports: {
    emailOwner: async (userId: string, subject: string, body: string) => { sent.push({ userId, subject, body }); return outcome; } } } as unknown as NodeModule;
  const api = require("@/app/api/brief/send/route");
  await check("send now: needs a session", async () => {
    me = null; assert.equal((await api.POST()).status, 401); me = { id: "u1", email: "u1@x.co" };
  });
  await check("send now: emails the owner the same brief the cron sends", async () => {
    const r = await api.POST(); assert.equal(r.status, 200);
    assert.equal(sent.length, 1); assert.equal(sent[0].userId, "u1"); assert.ok(sent[0].subject.length > 0 && sent[0].body.length > 0);
  });
  await check("send now: a failed send is reported, not claimed as sent", async () => {
    outcome = { status: "FAILED", detail: "Gmail refused" };
    const r = await api.POST(); assert.equal(r.status, 502); assert.equal((await r.json()).message, "Gmail refused");
    outcome = { status: "SUCCESS", detail: "ok" };
  });
  await check("send now: 3 a day, then 429", async () => {
    assert.equal((await api.POST()).status, 200, "3rd call today (failed sends count too)");
    assert.equal((await api.POST()).status, 429, "4th call today");
    me = { id: "u2", email: "u2@x.co" }; assert.equal((await api.POST()).status, 200, "limit is per user");
  });
  await check("send now: a loader error is a 502, never a crash", async () => {
    me = { id: "u3", email: "u3@x.co" }; loadFails = true;
    assert.equal((await api.POST()).status, 502); loadFails = false;
  });

  const M = require("@/lib/investor-metrics");
  const now = D("2026-11-19T12:00:00Z");
  const users = [
    { id: "a", createdAt: D("2026-11-01T10:00:00Z"), activated: true, gmail: true, brief: true },
    { id: "b", createdAt: D("2026-11-05T10:00:00Z"), activated: true, gmail: true, brief: false },
    { id: "c", createdAt: D("2026-11-10T10:00:00Z"), activated: false },
    { id: "d", createdAt: D("2026-11-18T10:00:00Z"), activated: true, gmail: true, brief: true }, // < 7 days ago
  ];
  const activeDays = new Map([
    ["a", new Set(["2026-11-01", "2026-11-09"])], // back on day 8
    ["b", new Set(["2026-11-05", "2026-11-11"])], // day 6 only: not "after a week"
    ["d", new Set(["2026-11-18", "2026-11-19"])],
  ]);
  const m = M.computeMetrics({ now, users, activeDays, waitlist: [] });
  await check("funnel: signed up → Gmail → brief → came back after a week", () => {
    assert.deepEqual(m.funnel.map((f: any) => [f.key, f.users, f.of]), [
      ["signed_up", 4, 4], ["gmail", 3, 4], ["brief", 2, 4], ["returned", 1, 3],
    ]);
  });
  await check("funnel: in the CSV", () => {
    assert.match(M.metricsCsv(m), /First-week step,Users,Out of\nSigned up,4,4\nConnected Gmail,3,4\nMorning brief on,2,4\nCame back after a week,1,3/);
  });
  await check("funnel: no users is zeros, not NaN", () => {
    const e = M.computeMetrics({ now, users: [], activeDays: new Map(), waitlist: [] });
    assert.ok(e.funnel.every((f: any) => f.users === 0 && f.of === 0));
  });

  console.log(results.join("\n")); console.log(fails ? `activation-test: ${fails} FAILED` : "activation-test: all passed"); process.exit(fails ? 1 : 0);
})();
