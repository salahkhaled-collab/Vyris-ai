// Investor metrics: real numbers only, owner only, and the visit log stores nothing but a day.
import assert from "node:assert/strict";
let me: any = { id: "owner", email: "owner@vyris.app" };
process.env.ADMIN_EMAILS = "owner@vyris.app";
const naPath = require.resolve("next-auth");
require.cache[naPath] = { id: naPath, filename: naPath, loaded: true, exports: { getServerSession: async () => (me ? { user: me } : null) } } as unknown as NodeModule;
const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }
const D = (s: string) => new Date(s);

(async () => {
  console.error = () => {};
  const M = require("@/lib/investor-metrics");
  await check("weeks start Monday 00:00 UTC", () => {
    assert.equal(M.dayKey(M.weekStart(D("2026-11-17T21:00:00Z"))), "2026-11-16"); // Tuesday -> Monday
    assert.equal(M.dayKey(M.weekStart(D("2026-11-16T00:00:00Z"))), "2026-11-16");
    assert.equal(M.dayKey(M.weekStart(D("2026-11-22T23:59:59Z"))), "2026-11-16"); // Sunday
  });

  const now = D("2026-11-17T12:00:00Z");
  const users = [
    { id: "a", createdAt: D("2026-10-12T10:00:00Z"), activated: true },  // cohort week of 12 Oct
    { id: "b", createdAt: D("2026-10-14T10:00:00Z"), activated: false }, // same cohort
    { id: "c", createdAt: D("2026-11-10T09:00:00Z"), activated: true },  // week of 10 Nov
    { id: "d", createdAt: D("2026-11-17T08:00:00Z"), activated: false }, // this week
  ];
  const activeDays = new Map([
    ["a", new Set(["2026-10-12", "2026-10-20", "2026-11-03", "2026-11-17"])], // weeks +1 and +3 after cohort
    ["b", new Set(["2026-10-14"])],
    ["c", new Set(["2026-11-11", "2026-11-12"])],
  ]);
  const waitlist = [D("2026-11-16T09:00:00Z"), D("2026-11-01T09:00:00Z"), D("2026-08-01T00:00:00Z")];
  const m = M.computeMetrics({ now, users, activeDays, waitlist });

  await check("totals: users, activated, waitlist, today / 7 days / 30 days", () => {
    assert.deepEqual(m.totals, { users: 4, activated: 2, waitlist: 3, dau: 1, wau: 2, mau: 2 });
  });
  await check("8 weekly rows, oldest first, ending with this week", () => {
    assert.equal(m.weeks.length, 8); assert.equal(m.weeks[7].week, "2026-11-16"); assert.equal(m.weeks[0].week, "2026-09-28");
    const w = (k: string) => m.weeks.find((x: any) => x.week === k);
    assert.deepEqual([w("2026-10-12").signups, w("2026-11-09").signups, w("2026-11-16").signups], [2, 1, 1]);
    assert.equal(w("2026-11-16").waitlist, 1); assert.equal(w("2026-10-26").waitlist, 1);
    assert.equal(w("2026-11-09").activeUsers, 1); assert.equal(w("2026-11-16").activeUsers, 1);
  });
  await check("retention: share of the cohort back in week +1..+4; unfinished weeks are blank", () => {
    const oct = m.cohorts.find((c: any) => c.week === "2026-10-12");
    assert.equal(oct.size, 2); assert.deepEqual(oct.retained, [50, 0, 50, 0]);
    const nov = m.cohorts.find((c: any) => c.week === "2026-11-09");
    assert.deepEqual(nov.retained, [null, null, null, null], "week of 16 Nov hasn't ended");
    const empty = m.cohorts.find((c: any) => c.week === "2026-09-28");
    assert.equal(empty.size, 0); assert.deepEqual(empty.retained, [null, null, null, null], "no users, no made-up 0%");
  });
  await check("paying is reported as not set up, never as a number", () => {
    assert.deepEqual(m.paying, { configured: false });
    assert.match(M.metricsCsv(m), /Paying users,Payments not set up yet/);
  });

  // Server: activity from visits plus user-made records; automated changes not counted.
  const { prisma } = require("@/lib/prisma");
  const seen: any = {};
  const Dp = (n: string, v: any) => Object.defineProperty(prisma, n, { value: v, configurable: true, writable: true });
  Dp("user", { findMany: async () => [{ id: "a", createdAt: D("2026-11-02T10:00:00Z") }, { id: "b", createdAt: D("2026-11-03T10:00:00Z") }] });
  Dp("account", { findMany: async () => [{ userId: "a", scope: "openid https://www.googleapis.com/auth/gmail.readonly" }] });
  Dp("project", { groupBy: async () => [], findMany: async () => [] });
  Dp("aiConversation", { groupBy: async () => [{ ownerId: "b" }] });
  Dp("userActivityDay", { findMany: async () => [{ userId: "a", day: "2026-11-10" }], createMany: async (x: any) => { seen.visit = x; return { count: 1 }; } });
  Dp("aiMessage", { findMany: async (x: any) => { seen.aiWhere = x.where; return [{ createdAt: D("2026-11-11T08:00:00Z"), conversation: { ownerId: "b" } }]; } });
  Dp("task", { findMany: async (x: any) => { seen.taskWhere = x.where; return [{ ownerId: "b", createdAt: D("2026-11-16T08:00:00Z") }]; } });
  Dp("decision", { findMany: async () => [] });
  Dp("waitlistEntry", { findMany: async () => [{ createdAt: D("2026-11-16T09:00:00Z") }] });
  const S = require("@/lib/investor-metrics-server");
  await check("loader: visits + messages the user sent + things they created; Gmail/AI count as activated", async () => {
    const r = await S.loadInvestorMetrics(now);
    assert.equal(seen.aiWhere.role, "user", "only the user's own messages, not the assistant's");
    assert.ok(seen.taskWhere.createdAt && !seen.taskWhere.updatedAt, "creation, not automated updates");
    assert.equal(r.totals.activated, 2);
    assert.equal(r.weeks.find((w: any) => w.week === "2026-11-09").activeUsers, 2);
    assert.equal(r.cohorts.find((c: any) => c.week === "2026-11-02").retained[0], 100);
  });
  await check("a visit stores only user and UTC day, and repeats are ignored", async () => {
    await S.recordVisit("a", D("2026-11-17T23:30:00Z"));
    assert.deepEqual(seen.visit, { data: [{ userId: "a", day: "2026-11-17" }], skipDuplicates: true });
  });

  const metricsApi = require("@/app/api/admin/metrics/route");
  const activityApi = require("@/app/api/activity/route");
  const req = (q = "") => ({ nextUrl: new URL("http://x/api/admin/metrics" + q) }) as any;
  await check("metrics: owner only; others get 404, logged-out 401", async () => {
    me = null; assert.equal((await metricsApi.GET(req())).status, 401);
    me = { id: "u", email: "someone@else.com" }; assert.equal((await metricsApi.GET(req())).status, 404);
    me = { id: "owner", email: "Owner@Vyris.app" }; const ok = await metricsApi.GET(req());
    assert.equal(ok.status, 200); assert.equal((await ok.json()).totals.users, 2);
  });
  await check("CSV download for a data room", async () => {
    const r = await metricsApi.GET(req("?format=csv"));
    assert.match(r.headers.get("content-type"), /text\/csv/); assert.match(r.headers.get("content-disposition"), /vyris-metrics-/);
    assert.match(await r.text(), /^Metric,Value/);
  });
  await check("visit ping: needs a session; never errors to the browser even if the DB fails", async () => {
    me = null; assert.equal((await activityApi.POST()).status, 401);
    me = { id: "a", email: "a@x.co" };
    Dp("userActivityDay", { createMany: async () => { throw new Error("db down"); } });
    assert.equal((await activityApi.POST()).status, 200);
  });
  console.log(results.join("\n")); console.log(fails ? `investor-metrics-test: ${fails} FAILED` : "investor-metrics-test: all passed"); process.exit(fails ? 1 : 0);
})();
