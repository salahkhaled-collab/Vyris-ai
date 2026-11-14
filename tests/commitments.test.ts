// Commitment tracking: validation, late-in-your-zone, promises found in a thread,
// API owner scoping, assistant tools behind approval, and the brief.
import assert from "node:assert/strict";
let me: any = { id: "u1", email: "u1@x.co", name: "Salah" };
const naPath = require.resolve("next-auth");
require.cache[naPath] = { id: naPath, filename: naPath, loaded: true, exports: { getServerSession: async () => (me ? { user: me } : null) } } as unknown as NodeModule;
const { prisma } = require("@/lib/prisma");
const rows: any[] = [];
let lastFind: any = null;
const match = (r: any, w: any) => Object.entries(w).every(([k, v]: any) =>
  v && typeof v === "object" && !(v instanceof Date) ? ("not" in v ? r[k] !== v.not : true) : r[k] === v);
const D = (n: string, v: any) => Object.defineProperty(prisma, n, { value: v, configurable: true, writable: true });
D("commitment", {
  findMany: async (a: any) => { lastFind = a; return rows.filter((r) => match(r, a.where)); },
  findFirst: async (a: any) => rows.find((r) => match(r, a.where)) ?? null,
  count: async (a: any) => rows.filter((r) => match(r, a.where)).length,
  create: async (a: any) => { const r = { id: "c" + (rows.length + 1), status: "OPEN", source: "manual", sourceRef: null, doneAt: null, createdAt: new Date(), updatedAt: new Date(), counterpart: null, dueDate: null, ...a.data }; rows.push(r); return r; },
  updateMany: async (a: any) => { const hit = rows.filter((r) => match(r, a.where)); hit.forEach((r) => Object.assign(r, a.data)); return { count: hit.length }; },
  deleteMany: async (a: any) => { const before = rows.length; for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i], a.where)) rows.splice(i, 1); return { count: before - rows.length }; },
});
D("user", { findUnique: async () => ({ timeZone: "Africa/Cairo", id: "u1", teamId: null }), findFirst: async () => null });

const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }
const req = (body: unknown) => ({ json: async () => body }) as any;

(async () => {
  console.error = () => {};
  const C = require("@/lib/commitments");
  await check("validation: direction exact, real dates only, text required", () => {
    assert.equal(C.validateCommitment({ text: "Send quote", direction: "mine" }).ok, true);
    assert.equal(C.validateCommitment({ text: "Send quote", direction: "ME" }).ok, false);
    assert.equal(C.validateCommitment({ text: "  ", direction: "MINE" }).ok, false);
    assert.equal(C.validateCommitment({ text: "x", direction: "MINE", dueDate: "2026-02-31" }).ok, false);
    assert.equal(C.validateCommitment({ text: "x".repeat(301), direction: "MINE" }).ok, false);
    const v = C.validateCommitment({ text: "x", direction: "THEIRS", dueDate: "2026-11-20", counterpart: "  Omar " });
    assert.deepEqual(v.value, { text: "x", direction: "THEIRS", dueDate: "2026-11-20", counterpart: "Omar" });
  });
  await check("late check: 23:30 Cairo on the due day is not late, 00:30 next day is", () => {
    const due = new Date("2026-11-14T00:00:00Z");
    assert.equal(C.isOverdue(due, new Date("2026-11-14T21:30:00Z"), "Africa/Cairo"), false);
    assert.equal(C.isOverdue(due, new Date("2026-11-14T22:30:00Z"), "Africa/Cairo"), true);
    assert.equal(C.isOverdue(null, new Date(), "Africa/Cairo"), false);
  });
  await check("promises from the model: invalid dropped, duplicates once, max 5", () => {
    const list = C.parseProposals([
      { text: "Send the signed contract", direction: "MINE", counterpart: "Omar", dueDate: "2026-11-19" },
      { text: "send the signed contract", direction: "MINE" },
      { text: "Confirm budget", direction: "THEIRS", dueDate: "Thursday" },
      { text: "", direction: "MINE" }, "junk",
      ...[1, 2, 3, 4, 5].map((n) => ({ text: "P" + n, direction: "THEIRS" })),
    ]);
    assert.equal(list.length, 5); assert.equal(list[0].dueDate, "2026-11-19");
    assert.ok(!list.some((p: any) => p.text === "Confirm budget"), "a bad date drops the item, not guessed");
  });
  await check("thread summary carries promises; old replies without them still parse", () => {
    const { parseThreadSummary, threadPrompt } = require("@/lib/inbox-ai");
    const s1 = parseThreadSummary(JSON.stringify({ summary: "s", keyPoints: [], needsReply: true, replyDraft: "d", commitments: [{ text: "Send deck", direction: "MINE", counterpart: "Sara", dueDate: null }] }));
    assert.equal(s1.commitments.length, 1);
    const s2 = parseThreadSummary(JSON.stringify({ summary: "s", keyPoints: [], needsReply: false, replyDraft: "" }));
    assert.deepEqual(s2.commitments, []);
    const p = threadPrompt("Salah", "s@x.co", [], "Saturday, 2026-11-14");
    assert.ok(p.includes("Today is Saturday, 2026-11-14")); assert.ok(p.includes('"commitments"'));
  });

  const list = require("@/app/api/commitments/route");
  const one = require("@/app/api/commitments/[id]/route");
  await check("API needs a session", async () => {
    me = null; assert.equal((await list.GET()).status, 401); assert.equal((await list.POST(req({ text: "a", direction: "MINE" }))).status, 401); me = { id: "u1", name: "Salah" };
  });
  await check("POST saves; same promise from the same thread is saved once", async () => {
    const body = { text: "Send the revised quote", direction: "MINE", counterpart: "Omar", dueDate: "2026-11-13", source: "email", sourceRef: "thread_1" };
    const r1 = await list.POST(req(body)); assert.equal(r1.status, 201);
    const r2 = await list.POST(req(body)); const d2 = await r2.json(); assert.equal(d2.duplicate, true);
    assert.equal(rows.length, 1); assert.equal(rows[0].ownerId, "u1"); assert.equal(rows[0].source, "email");
    assert.equal((await list.POST(req({ text: "x", direction: "MINE", sourceRef: "bad ref!" }))).status, 201);
    assert.equal(rows[1].sourceRef, null, "unsafe ref is dropped"); assert.equal(rows[1].source, "manual");
    assert.equal((await list.POST(req({ text: "x", direction: "MAYBE" }))).status, 400);
  });
  await check("GET returns only my rows, late first, with late flag in my zone", async () => {
    rows.push({ id: "other", ownerId: "u2", text: "Not mine", direction: "MINE", status: "OPEN", dueDate: null });
    const d = await (await list.GET()).json();
    assert.ok(!d.open.some((r: any) => r.id === "other"));
    assert.equal(d.open[0].text, "Send the revised quote"); assert.equal(d.open[0].overdue, true); assert.equal(d.open[0].dueDate, "2026-11-13");
  });
  await check("PATCH/DELETE can't touch someone else's promise", async () => {
    const ctx = { params: { id: "other" } };
    assert.equal((await one.PATCH(req({ status: "DONE" }), ctx)).status, 404);
    assert.equal((await one.DELETE(req(null), ctx)).status, 404);
    assert.equal(rows.find((r) => r.id === "other").status, "OPEN");
  });
  await check("PATCH marks done with a time, reopen clears it, bad input refused", async () => {
    const ctx = { params: { id: "c1" } };
    assert.equal((await one.PATCH(req({ status: "done" }), ctx)).status, 200);
    assert.equal(rows[0].status, "DONE"); assert.ok(rows[0].doneAt instanceof Date);
    await one.PATCH(req({ status: "OPEN" }), ctx); assert.equal(rows[0].doneAt, null);
    assert.equal((await one.PATCH(req({ status: "LATER" }), ctx)).status, 400);
    assert.equal((await one.PATCH(req({ dueDate: "tomorrow" }), ctx)).status, 400);
    assert.equal((await one.PATCH(req({}), ctx)).status, 400);
  });

  const { runTool } = require("@/lib/ai/tools");
  const { isWriteTool, summarizeAction, normalizeActionInput } = require("@/lib/ai/actions");
  const scope = { userId: "u1", teamId: "t1" };
  await check("assistant: writes need approval, summary shows every part", () => {
    assert.equal(isWriteTool("track_commitment"), true); assert.equal(isWriteTool("complete_commitment"), true); assert.equal(isWriteTool("get_commitments"), false);
    assert.equal(summarizeAction("track_commitment", { text: "Send deck", direction: "MINE", counterpart: "Sara", dueDate: "2026-11-20" }), 'Track your promise: "Send deck" to Sara, due 2026-11-20');
    assert.equal(summarizeAction("track_commitment", { text: "Confirm budget", direction: "THEIRS", counterpart: "Omar" }), 'Track Omar\'s promise: "Confirm budget"');
    assert.equal(summarizeAction("complete_commitment", { status: "DROPPED" }, { commitment: "Send deck" }), 'Mark promise "Send deck" as Dropped');
    assert.equal(normalizeActionInput("track_commitment", { text: "x", direction: "maybe" }).ok, false);
  });
  await check("assistant tools: own promises only, even in a team", async () => {
    const got: any = await runTool("get_commitments", {}, scope);
    assert.ok(got.open.length >= 2 && got.open.every((r: any) => r.id !== "other"));
    const t: any = await runTool("track_commitment", { text: "Call the bank", direction: "MINE", dueDate: "2026-11-16" }, scope);
    assert.equal(t.ok, true); assert.equal(rows.at(-1).source, "assistant"); assert.equal(rows.at(-1).ownerId, "u1");
    const bad: any = await runTool("complete_commitment", { commitmentId: "other", status: "DONE" }, scope);
    assert.equal(bad.ok, false); assert.equal(rows.find((r) => r.id === "other").status, "OPEN");
    const ok: any = await runTool("complete_commitment", { commitmentId: t.created.id, status: "DONE" }, scope);
    assert.equal(ok.ok, true);
  });
  await check("open promises are read oldest-due first, so late ones are never cut off", async () => {
    await runTool("get_commitments", {}, scope);
    assert.deepEqual(lastFind.orderBy[0], { dueDate: { sort: "asc", nulls: "last" } });
    const { loadOpenCommitments } = require("@/lib/commitments-server");
    await loadOpenCommitments("u1", new Date(), "UTC");
    assert.deepEqual(lastFind.orderBy[0], { dueDate: { sort: "asc", nulls: "last" } });
  });
  await check("the assistant can't pass the 200 open-promise cap", async () => {
    const before = rows.length;
    for (let i = 0; i < 200; i++) rows.push({ id: "bulk" + i, ownerId: "u1", text: "b" + i, direction: "MINE", status: "OPEN", dueDate: null });
    const r: any = await runTool("track_commitment", { text: "One more", direction: "MINE" }, scope);
    assert.equal(r.ok, false); assert.match(r.error, /200 promises/);
    rows.splice(before, 200);
  });
  await check("brief: open promises in the user's zone, late one makes focus", async () => {
    const { loadOpenCommitments } = require("@/lib/commitments-server");
    const b = await loadOpenCommitments("u1", new Date("2026-11-14T08:00:00Z"), "Africa/Cairo");
    assert.equal(b[0].text, "Send the revised quote"); assert.equal(b[0].owner, "me"); assert.equal(b[0].overdue, true);
    const { pickFocus } = require("@/lib/morning-brief");
    const f = pickFocus({ report: { overdue: [], blocked: [], dueSoon: [], idleProjects: [], total: 0 }, meetings: null, unanswered: null, changes: [], goals: [], commitments: b, now: new Date(), timeZone: "Africa/Cairo" });
    assert.equal(f[0].kind, "promise"); assert.match(f[0].why, /You told Omar by 2026-11-13/);
    D("commitment", { findMany: async () => { throw new Error("db down"); } });
    assert.deepEqual(await loadOpenCommitments("u1", new Date()), [], "a failing table never blocks the brief");
  });
  console.log(results.join("\n")); console.log(fails ? `commitments-test: ${fails} FAILED` : "commitments-test: all passed"); process.exit(fails ? 1 : 0);
})();
