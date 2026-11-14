// Morning brief: what leads, what's left out, the email text, and the loader.
import assert from "node:assert/strict";
import { pickFocus, buildBrief, briefEmail } from "@/lib/morning-brief";
const now = new Date("2026-11-15T05:25:00Z"); // 07:25 Cairo
const tz = "Africa/Cairo";
const empty = { overdue: [], blocked: [], dueSoon: [], idleProjects: [], total: 0 };
const item = (o: any) => ({ taskId: "t", projectId: "p", dueDate: null, ...o });
const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }
(async () => {
  console.error = () => {};
  await check("one item per source first: blocked, reply, overdue", () => {
    const f = pickFocus({
      report: { ...empty, blocked: [item({ title: "Logo", projectTitle: "Northwind", blockedReason: "client approval" }), item({ title: "B2", projectTitle: "X" })],
        overdue: [item({ title: "Invoice", projectTitle: "Atlas", daysOverdue: 2 }), item({ title: "Deck", projectTitle: "Atlas", daysOverdue: 9 })] },
      meetings: null, unanswered: [{ threadId: "t", from: "Omar", subject: "Quote", daysWaiting: 5 }], changes: [], goals: [], now, timeZone: tz,
    });
    assert.deepEqual(f.map((x) => x.kind), ["blocked", "reply", "overdue"]);
    assert.equal(f[2].title, 'Finish "Deck" (Atlas)', "most overdue first"); assert.equal(f[0].why, "Blocked: client approval");
  });
  await check("fills from the same source when others are empty", () => {
    const f = pickFocus({ report: { ...empty, overdue: [1, 2, 3, 4].map((n) => item({ title: "T" + n, projectTitle: "P", daysOverdue: n })) }, meetings: [], unanswered: null, changes: [], goals: [], now, timeZone: tz });
    assert.deepEqual(f.map((x) => x.title), ['Finish "T4" (P)', 'Finish "T3" (P)', 'Finish "T2" (P)']);
  });
  await check("replies under 3 days don't make focus; meetings need a project and guests", () => {
    const f = pickFocus({ report: empty, unanswered: [{ threadId: "t", from: "A", subject: "s", daysWaiting: 2 }],
      meetings: [{ title: "Standup", start: "2026-11-15T08:00:00Z", allDay: false, attendees: ["x@y.co"], project: null },
                 { title: "Atlas review", start: "2026-11-15T09:30:00Z", allDay: false, attendees: ["sara@atlas.com"], project: "Atlas Retail" }],
      changes: [], goals: [], now, timeZone: tz });
    assert.deepEqual(f.map((x) => x.title), ['Prepare for "Atlas review" at 11:30 AM'], "Cairo time");
  });
  await check("due today uses the user's day", () => {
    const f = pickFocus({ report: { ...empty, dueSoon: [item({ title: "Pay rent", projectTitle: "Ops", dueDate: "2026-11-15T00:00:00.000Z" }), item({ title: "Later", projectTitle: "Ops", dueDate: "2026-11-17T00:00:00.000Z" })] }, meetings: null, unanswered: null, changes: [], goals: [], now, timeZone: tz });
    assert.deepEqual(f.map((x) => x.title), ['"Pay rent" is due today']);
  });
  await check("late promise of mine ranks right after blocked work", () => {
    const f = pickFocus({ report: { ...empty, blocked: [item({ title: "B", projectTitle: "P" })] }, meetings: null, unanswered: null, changes: [], goals: [], now, timeZone: tz,
      commitments: [{ text: "Send the proposal", counterpart: "Omar", owner: "me", dueDate: "2026-11-13", overdue: true }, { text: "Confirm budget", counterpart: "Sara", owner: "them", dueDate: null, overdue: true }] });
    assert.deepEqual(f.map((x) => x.kind), ["blocked", "promise"]); assert.match(f[1].why, /You told Omar by 2026-11-13/);
  });
  await check("due today is the stored day, also west of UTC", () => {
    const ny = new Date("2026-11-14T15:00:00Z"); // 10:00 on the 14th in New York
    const f = pickFocus({ report: { ...empty, dueSoon: [item({ title: "Today", projectTitle: "P", dueDate: "2026-11-14T00:00:00.000Z" }), item({ title: "Tomorrow", projectTitle: "P", dueDate: "2026-11-15T00:00:00.000Z" })] }, meetings: null, unanswered: null, changes: [], goals: [], now: ny, timeZone: "America/New_York" });
    assert.deepEqual(f.map((x) => x.title), ['"Today" is due today']);
  });
  await check("not a clear day while people wait on a reply", () => {
    const b = buildBrief({ report: empty, meetings: [], unanswered: [{ threadId: "t", from: "Omar", subject: "s", daysWaiting: 1 }], changes: [], goals: [], now, timeZone: tz });
    assert.equal(b.allClear, false);
    const e = briefEmail(b, now, tz, "https://v"); assert.notEqual(e.subject, "Your Vyris brief: a clear day"); assert.ok(e.body.includes("WAITING ON YOUR REPLY"));
    const unknown = briefEmail(buildBrief({ report: empty, meetings: [], unanswered: null, changes: [], goals: [], now, timeZone: tz }), now, tz, "https://v");
    assert.ok(unknown.body.includes("Nothing is blocked or late. A good"), "doesn't claim nobody is waiting when the inbox wasn't checked");
  });
  await check("all clear email is short and says so", () => {
    const b = buildBrief({ report: empty, meetings: [], unanswered: [], changes: [], goals: [], now, timeZone: tz });
    assert.equal(b.allClear, true);
    const e = briefEmail(b, now, tz, "https://vyris.vercel.app");
    assert.equal(e.subject, "Your Vyris brief: a clear day");
    assert.ok(e.body.includes("Sunday 15 November"), e.body.slice(0, 80));
    assert.ok(!e.body.includes("FOCUS TODAY"));
  });
  await check("full email: sections present, unconnected ones left out, better changes hidden", () => {
    const b = buildBrief({ report: { ...empty, blocked: [item({ title: "Logo", projectTitle: "Northwind", blockedReason: "client" })] },
      meetings: [{ title: "Atlas review", start: "2026-11-15T09:30:00Z", allDay: false, attendees: ["sara@atlas.com"], project: "Atlas Retail" }],
      unanswered: null,
      changes: [{ metric: "overdue", label: "7 overdue tasks, up from about 2 on a usual day", today: 7, usual: 2, direction: "worse" }, { metric: "blocked", label: "better one", today: 0, usual: 5, direction: "better" }],
      goals: [{ objectiveId: "o", title: "Revenue 50k", quarter: "Q3 2026", progress: 62, expected: 100, missed: true }], now, timeZone: tz });
    const e = briefEmail(b, now, tz, "https://vyris.vercel.app");
    assert.equal(e.subject, "Your Vyris brief: 2 things for today");
    for (const want of ["FOCUS TODAY", '1. Unblock "Logo" (Northwind). Blocked: client.', "MEETINGS TODAY", "11:30 AM: Atlas review with sara@atlas.com (about Atlas Retail)", "WHAT CHANGED", "7 overdue tasks", "GOALS", "Revenue 50k: Q3 2026 ended at 62%", "2. Prepare for \"Atlas review\" at 11:30 AM", "https://vyris.vercel.app/dashboard"]) assert.ok(e.body.includes(want), want);
    assert.ok(!e.body.includes("WAITING ON YOUR REPLY"), "no inbox section without Gmail");
    assert.ok(!e.body.includes("better one"));
  });

  // Loader: Google optional, user zone used, cron path sends the brief
  const { prisma } = require("@/lib/prisma");
  const D = (n: string, v: any) => Object.defineProperty(prisma, n, { value: v, configurable: true, writable: true });
  D("user", { findUnique: async () => ({ timeZone: "Africa/Cairo", email: "s@x.co" }), findMany: async () => [] });
  D("account", { findFirst: async () => null });
  D("commitment", { findMany: async () => [] });
  for (const n of ["project", "objective", "strategicBet", "risk"]) D(n, { findMany: async () => [] });
  D("task", { findMany: async () => [], count: async () => 0 });
  D("workspaceSnapshot", { upsert: async (a: any) => a.create, findMany: async () => [] });
  const { loadBrief } = require("@/lib/morning-brief-server");
  await check("loader works with nothing connected", async () => {
    const { brief, timeZone, inbox } = await loadBrief("u1", now, { withInbox: true });
    assert.equal(timeZone, "Africa/Cairo"); assert.equal(inbox, "not_connected", "no Google account means connect, not failed"); assert.equal(brief.meetings, null); assert.equal(brief.unanswered, null); assert.equal(brief.allClear, true);
  });
  console.log(results.join("\n")); console.log(fails ? `brief-test: ${fails} FAILED` : "brief-test: all passed"); process.exit(fails ? 1 : 0);
})();
