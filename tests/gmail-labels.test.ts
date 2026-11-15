// Gmail labels: only Vyris labels change, permission asked only when needed.
import assert from "node:assert/strict";
let me: any = { id: "u1", email: "salah@vyris.studio" };
const naPath = require.resolve("next-auth");
require.cache[naPath] = { id: naPath, filename: naPath, loaded: true, exports: { getServerSession: async () => (me ? { user: me } : null) } } as unknown as NodeModule;
const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }

const READ = "https://www.googleapis.com/auth/gmail.readonly";
const MODIFY = "https://www.googleapis.com/auth/gmail.modify";
let scope = `openid email ${READ}`;
const { prisma } = require("@/lib/prisma");
Object.defineProperty(prisma, "account", { configurable: true, value: { findFirst: async () => ({ id: "a", access_token: "tok", refresh_token: "r", expires_at: Math.floor(Date.now() / 1000) + 3600, scope }) } });

let existing: { id: string; name: string }[] = [];
const calls: { method: string; path: string; body: any }[] = [];
let rejectColor = false; let modifyStatus = 200;
globalThis.fetch = (async (u: string, init: any = {}) => {
  const path = String(u).replace("https://gmail.googleapis.com/gmail/v1/users/me", "");
  const body = init.body ? JSON.parse(init.body) : null; const method = init.method ?? "GET";
  calls.push({ method, path, body });
  if (path === "/labels" && method === "GET") return new Response(JSON.stringify({ labels: [{ id: "INBOX", name: "INBOX" }, ...existing] }), { status: 200 });
  if (path === "/labels" && method === "POST") {
    if (rejectColor && body.color) return new Response("{\"error\":\"bad color\"}", { status: 400 });
    const l = { id: "Label_" + (existing.length + 1), name: body.name }; existing.push(l); return new Response(JSON.stringify(l), { status: 200 });
  }
  if (path === "/messages/batchModify") return new Response("", { status: modifyStatus });
  return new Response("{}", { status: 404 });
}) as typeof fetch;

(async () => {
  console.error = () => {};
  const L = require("@/lib/gmail-labels");
  await check("input: valid priorities and safe ids only, max 100, each email once", () => {
    assert.deepEqual(L.parseAssignments([{ id: "18c2f0a1b2c3", priority: "urgent" }, { id: "18c2f0a1b2c3", priority: "low" }]), [{ id: "18c2f0a1b2c3", priority: "low" }]);
    assert.equal(L.parseAssignments([{ id: "../../labels", priority: "low" }]), null);
    assert.equal(L.parseAssignments([{ id: "18c2f0a1b2c3", priority: "spam" }]), null);
    assert.equal(L.parseAssignments([]), null);
    assert.equal(L.parseAssignments(Array.from({ length: 101 }, (_, i) => ({ id: "18c2f0a1b2" + String(i).padStart(3, "0"), priority: "fyi" }))), null);
  });
  await check("creates the four Vyris labels once, with colors; reuses them next time", async () => {
    calls.length = 0;
    const ids = await L.ensureLabels("tok");
    assert.deepEqual(existing.map((l) => l.name), ["Vyris/Urgent", "Vyris/Needs reply", "Vyris/FYI", "Vyris/Low"]);
    assert.ok(calls.filter((c) => c.method === "POST").every((c) => c.body.color?.backgroundColor));
    calls.length = 0; const again = await L.ensureLabels("tok");
    assert.deepEqual(again, ids); assert.equal(calls.filter((c) => c.method === "POST").length, 0);
  });
  await check("a rejected color doesn't block the label", async () => {
    existing = []; rejectColor = true; calls.length = 0;
    await L.ensureLabels("tok"); rejectColor = false;
    assert.equal(existing.length, 4);
  });
  await check("each email gets exactly one Vyris label; nothing else is touched", async () => {
    calls.length = 0;
    const r = await L.applyPriorityLabels("tok", [{ id: "aaaaaa1", priority: "urgent" }, { id: "aaaaaa2", priority: "urgent" }, { id: "aaaaaa3", priority: "low" }]);
    assert.equal(r.applied, 3);
    const mods = calls.filter((c) => c.path === "/messages/batchModify");
    assert.equal(mods.length, 2);
    const urgent = mods[0].body; const vyrisIds = existing.map((l) => l.id);
    assert.deepEqual(urgent.ids, ["aaaaaa1", "aaaaaa2"]); assert.equal(urgent.addLabelIds.length, 1);
    assert.equal(urgent.removeLabelIds.length, 3);
    for (const m of mods) for (const id of [...m.body.addLabelIds, ...m.body.removeLabelIds]) assert.ok(vyrisIds.includes(id), `only Vyris labels change, got ${id}`);
    assert.ok(!JSON.stringify(mods).includes("UNREAD") && !JSON.stringify(mods).includes("INBOX"), "never archives or marks read");
  });

  const { POST } = require("@/app/api/gmail/labels/route");
  const req = (b: unknown) => ({ json: async () => b }) as any;
  const good = { assignments: [{ id: "aaaaaa1", priority: "needs_reply" }] };
  await check("needs a session; bad input refused before Gmail", async () => {
    me = null; assert.equal((await POST(req(good))).status, 401); me = { id: "u1" };
    assert.equal((await POST(req({ assignments: [{ id: "x", priority: "low" }] }))).status, 400);
  });
  await check("without the label permission: 403 missing_scope, Gmail not called", async () => {
    calls.length = 0; const res = await POST(req(good)); const d = await res.json();
    assert.equal(res.status, 403); assert.equal(d.error, "missing_scope"); assert.equal(calls.length, 0);
  });
  await check("with the permission: labels applied", async () => {
    scope = `openid email ${READ} ${MODIFY}`;
    const res = await POST(req(good)); assert.equal(res.status, 200); assert.equal((await res.json()).applied, 1);
  });
  await check("Google refuses the change (permission unticked): asks again instead of failing", async () => {
    modifyStatus = 403; const res = await POST(req(good)); modifyStatus = 200;
    assert.equal(res.status, 403); assert.equal((await res.json()).error, "missing_scope");
  });
  await check("the label permission is its own Connect step; reading mail doesn't need it", () => {
    const { connectParams, hasFeatureScopes } = require("@/lib/google-scopes");
    assert.ok(connectParams("gmail_labels").scope.includes(MODIFY)); assert.ok(!connectParams("gmail").scope.includes(MODIFY));
    assert.equal(hasFeatureScopes(`${READ}`, "gmail"), true); assert.equal(hasFeatureScopes(`${READ}`, "gmail_labels"), false);
    assert.equal(connectParams("gmail_labels").include_granted_scopes, "true", "keeps read and send when adding labels");
  });
  console.log(results.join("\n")); console.log(fails ? `gmail-labels-test: ${fails} FAILED` : "gmail-labels-test: all passed"); process.exit(fails ? 1 : 0);
})();
