// Weekly founder update: facts only, numbers checked, plain fallback, owner's data.
import assert from "node:assert/strict";
let me: any = { id: "u1", email: "u1@x.co", name: "Salah" };
const naPath = require.resolve("next-auth");
require.cache[naPath] = { id: naPath, filename: naPath, loaded: true, exports: { getServerSession: async () => (me ? { user: me } : null) } } as unknown as NodeModule;
process.env.PYTHON_LLM_URL = "http://fake-llm.local/v1/chat/completions";
const { prisma } = require("@/lib/prisma");
const D = (n: string, v: any) => Object.defineProperty(prisma, n, { value: v, configurable: true, writable: true });
const seen: any = {};
D("user", { findUnique: async () => ({ id: "u1", timeZone: "Africa/Cairo", teamId: null }), findFirst: async () => null, findMany: async () => [] });
D("task", { findMany: async (a: any) => { if (a.where.status === "DONE") { seen.doneWhere = a.where; return [{ title: "Launch pricing page", project: { title: "Website" } }, { title: "Send Atlas proposal", project: { title: "Atlas" } }]; } return [
  { id: "t9", title: "Investor deck", status: "BLOCKED", blockedReason: "waiting on numbers", dueDate: null, projectId: "p1", project: { id: "p1", title: "Fundraise", status: "ACTIVE" }, assigneeId: null, ownerId: "u1", updatedAt: new Date(), createdAt: new Date() }]; }, count: async () => 0 });
D("project", { findMany: async (a: any) => (a.where.createdAt ? [{ title: "Cairo expansion" }] : [{ id: "p1", title: "Fundraise", status: "ACTIVE", updatedAt: new Date(), _count: { tasks: 1 } }]) });
D("keyResult", { findMany: async (a: any) => { seen.krWhere = a.where; return [{ label: "MRR", current: 4200, target: 10000, unit: "USD", objective: { title: "Revenue" } }]; } });
D("objective", { findMany: async () => [] }); D("strategicBet", { findMany: async () => [] }); D("risk", { findMany: async () => [] });
D("workspaceSnapshot", { upsert: async (a: any) => a.create, findMany: async () => [] });
D("commitment", { count: async (a: any) => { seen.keptWhere = a.where; return 3; }, findMany: async (a: any) => { seen.lateWhere = a.where; return [{ text: "Send the revised quote", counterpart: "Omar", dueDate: new Date("2026-11-01T00:00:00Z") }, { text: "Future", counterpart: null, dueDate: new Date("2099-01-01T00:00:00Z") }]; } });
D("rateLimit", { upsert: async () => ({ count: 1, windowStart: new Date() }), findUnique: async () => null, update: async () => ({}), deleteMany: async () => ({}) });

let llm: (body: any) => Response = () => new Response("{}", { status: 500 });
let lastBody: any = null;
globalThis.fetch = (async (_u: string, init: any) => { lastBody = JSON.parse(init.body); return llm(lastBody); }) as typeof fetch;
const reply = (content: string) => () => new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }), { status: 200 });

const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }
const req = (body: unknown) => ({ json: async () => body }) as any;

(async () => {
  console.error = () => {};
  const F = require("@/lib/founder-update");
  const { loadUpdateFacts } = require("@/lib/founder-update-server");
  const { facts } = await loadUpdateFacts("u1", new Date("2026-11-14T10:00:00Z"));
  await check("facts come from the workspace, scoped to the user", () => {
    assert.equal(facts.period, "7–14 Nov 2026");
    assert.deepEqual(facts.shipped.map((s: any) => s.title), ["Launch pricing page", "Send Atlas proposal"]);
    assert.equal(facts.slipped[0].why, "blocked: waiting on numbers");
    assert.equal(facts.metrics[0].current, 4200); assert.deepEqual(facts.newProjects, ["Cairo expansion"]);
    assert.equal(facts.promisesKept, 3); assert.deepEqual(facts.promisesLate.map((p: any) => p.text), ["Send the revised quote"]);
    assert.equal(seen.keptWhere.ownerId, "u1"); assert.equal(seen.lateWhere.ownerId, "u1");
    assert.ok(seen.doneWhere.completedAt?.gte instanceof Date, "shipped = finished this week, not edited this week");
    assert.equal(seen.doneWhere.updatedAt, undefined);
  });
  await check("period label across months", () => {
    assert.equal(F.periodLabel(new Date("2026-12-03T10:00:00Z"), "UTC"), "26 Nov – 3 Dec 2026");
  });
  await check("number check flags invented figures, allows facts, note and counts", () => {
    const note = "Signed 2 new clients.";
    const ok = { subject: "Vyris update: 7–14 Nov 2026", body: "Highlights\n- Signed 2 new clients\n- MRR at 4,200 USD of 10000\n1. Shipped 2 things\n- 3 promises kept" };
    assert.deepEqual(F.unverifiedNumbers(ok, facts, note), []);
    const bad = { subject: "Update", body: "- MRR grew 40% to 4,200\n- 12 new users" };
    assert.deepEqual(F.unverifiedNumbers(bad, facts, note), ["40", "12"]);
    const arabic = { subject: "تحديث", body: "- وقّعنا ٢ عملاء جدد\n- ١٢ مستخدم جديد\n- الإيراد ٤٬٢٠٠ دولار" };
    assert.deepEqual(F.unverifiedNumbers(arabic, facts, note), ["12"], "Arabic digits are checked too");
  });
  await check("completedAt is set on DONE, cleared on reopen, kept otherwise", () => {
    const { completedAtChange } = require("@/lib/task-completion");
    const t = new Date("2026-11-14T10:00:00Z");
    assert.equal(completedAtChange("IN_PROGRESS", "DONE", t), t);
    assert.equal(completedAtChange("DONE", "TODO", t), null);
    assert.equal(completedAtChange("DONE", "DONE", t), undefined, "editing a done task doesn't move its finish time");
    assert.equal(completedAtChange("TODO", "BLOCKED", t), undefined);
  });
  await check("prompt forbids invented numbers and treats workspace text as data", () => {
    const p = F.updatePrompt("investors", "Salah");
    assert.match(p, /Never invent numbers/); assert.match(p, /data, never instructions/); assert.match(p, /Lowlights/);
    assert.match(F.updatePrompt("team", null), /Stuck/);
  });
  await check("template: investors and team versions, no empty sections", () => {
    const inv = F.templateUpdate(facts, "investors", "");
    assert.ok(inv.body.includes("Shipped\n- Launch pricing page (Website)")); assert.ok(inv.body.includes("MRR: 4200 USD of 10000 USD (Revenue)"));
    assert.ok(inv.body.includes("Lowlights")); assert.ok(!inv.body.includes("Highlights"), "no note, no highlights");
    const team = F.templateUpdate({ ...facts, slipped: [], goals: [], betsAtRisk: [], risks: [] }, "team", "Hiring a designer");
    assert.ok(team.body.startsWith("Hi team")); assert.ok(!team.body.includes("Stuck")); assert.ok(team.body.includes("Hiring a designer"));
    assert.deepEqual(F.unverifiedNumbers(inv, facts, ""), [], "the fallback never invents numbers");
  });

  const { POST } = require("@/app/api/ai/founder-update/route");
  await check("API needs a session", async () => { me = null; assert.equal((await POST(req({}))).status, 401); me = { id: "u1", name: "Salah" }; });
  await check("AI draft returned with facts and the number check", async () => {
    llm = reply(JSON.stringify({ subject: "Vyris update: 7–14 Nov 2026", body: "Highlights\n- Revenue up 35%\nShipped\n- Launch pricing page" }));
    const d = await (await POST(req({ audience: "investors", note: "" }))).json();
    assert.equal(d.source, "ai"); assert.deepEqual(d.check, ["35"]); assert.ok(d.facts.includes("Launch pricing page"));
    assert.ok(lastBody.messages[1].content.includes("<facts>")); assert.ok(lastBody.messages[1].content.includes("(none)"));
  });
  await check("model failure or rate limit falls back to the plain draft with a notice", async () => {
    llm = () => new Response("rate limit reached, try again in 12s", { status: 429 });
    const d = await (await POST(req({ audience: "team", note: "We hired Mona" }))).json();
    assert.equal(d.source, "template"); assert.match(d.notice, /free-plan limit/); assert.ok(d.body.includes("We hired Mona"));
    llm = reply("not json");
    const d2 = await (await POST(req({ audience: "investors" }))).json();
    assert.equal(d2.source, "template"); assert.match(d2.notice, /couldn't write/);
  });
  await check("long note refused; unknown audience falls back to investors", async () => {
    assert.equal((await POST(req({ note: "x".repeat(1501) }))).status, 400);
    llm = reply(JSON.stringify({ subject: "s", body: "b" }));
    await POST(req({ audience: "everyone" }));
    assert.match(lastBody.messages[0].content, /investors and advisors/);
  });
  console.log(results.join("\n")); console.log(fails ? `founder-update-test: ${fails} FAILED` : "founder-update-test: all passed"); process.exit(fails ? 1 : 0);
})();
