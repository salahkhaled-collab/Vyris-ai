// In-app feedback: saved for the owner, emailed to the owner, owner-only list, safe CSV.
import assert from "node:assert/strict";
let me: any = { id: "u1", email: "mona@nile.studio", name: "Mona" };
process.env.ADMIN_EMAILS = "owner@vyris.app, second@vyris.app";
process.env.RESEND_API_KEY = "re_test_key";
const naPath = require.resolve("next-auth");
require.cache[naPath] = { id: naPath, filename: naPath, loaded: true, exports: { getServerSession: async () => (me ? { user: me } : null) } } as unknown as NodeModule;
const sent: any[] = [];
const rsPath = require.resolve("resend");
require.cache[rsPath] = { id: rsPath, filename: rsPath, loaded: true, exports: { Resend: class { emails = { send: async (x: any) => { sent.push(x); return { error: null }; } }; } } } as unknown as NodeModule;
const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }
const { prisma } = require("@/lib/prisma");
const rows: any[] = [];
Object.defineProperty(prisma, "feedback", { configurable: true, value: {
  create: async (a: any) => { const r = { id: "f" + rows.length, createdAt: new Date("2026-11-17T19:00:00Z"), ...a.data }; rows.push(r); return r; },
  findMany: async () => rows.map((r) => ({ ...r, user: { name: r.userId === "u1" ? "Mona" : "X", email: "mona@nile.studio" } })).reverse(),
} });
const req = (b: unknown) => ({ json: async () => b }) as any;

(async () => {
  console.error = () => {};
  const { validateFeedback } = require("@/lib/feedback");
  await check("validation: text or mood needed; unknown mood dropped; only app paths kept", () => {
    assert.equal(validateFeedback({ message: "  " }).ok, false);
    assert.deepEqual(validateFeedback({ mood: "great" }).value, { message: "", mood: "great", page: null });
    assert.equal(validateFeedback({ message: "hi", mood: "angry" }).value.mood, null);
    assert.equal(validateFeedback({ message: "hi", page: "/inbox" }).value.page, "/inbox");
    assert.equal(validateFeedback({ message: "hi", page: "https://evil.com" }).value.page, null);
    assert.equal(validateFeedback({ message: "hi", page: "/inbox?token=abc" }).value.page, null);
    assert.equal(validateFeedback({ message: "x".repeat(2001) }).ok, false);
  });
  const { POST } = require("@/app/api/feedback/route");
  await check("needs a session", async () => { me = null; assert.equal((await POST(req({ message: "hi" }))).status, 401); me = { id: "u1", email: "mona@nile.studio", name: "Mona" }; });
  await check("saves it and emails the first owner, with HTML escaped", async () => {
    const res = await POST(req({ message: "The <b>inbox</b> is great but slow\nبطيء شوية", mood: "ok", page: "/inbox" }));
    assert.equal(res.status, 201); assert.equal(rows[0].userId, "u1"); assert.equal(rows[0].mood, "ok");
    assert.equal(sent.length, 1); assert.equal(sent[0].to, "owner@vyris.app");
    assert.equal(sent[0].subject, "Vyris feedback from Mona: It's okay");
    assert.ok(sent[0].html.includes("&lt;b&gt;inbox&lt;/b&gt;") && !sent[0].html.includes("<b>inbox"), "user text can't inject HTML");
    assert.ok(sent[0].html.includes("بطيء شوية"));
  });
  await check("still saved when the email fails", async () => {
    require.cache[rsPath]!.exports = { Resend: class { emails = { send: async () => { throw new Error("resend down"); } }; } };
    const before = rows.length; const res = await POST(req({ message: "second" }));
    assert.equal(res.status, 201); assert.equal(rows.length, before + 1);
  });
  const admin = require("@/app/api/admin/feedback/route");
  const areq = (q = "") => ({ nextUrl: new URL("http://x/api/admin/feedback" + q) }) as any;
  await check("owner-only list: others 404, logged-out 401", async () => {
    me = null; assert.equal((await admin.GET(areq())).status, 401);
    me = { id: "u1", email: "mona@nile.studio" }; assert.equal((await admin.GET(areq())).status, 404);
    me = { id: "o", email: "SECOND@vyris.app" }; const d = await (await admin.GET(areq())).json();
    assert.equal(d.entries.length, 2); assert.equal(d.entries[0].email, "mona@nile.studio");
  });
  await check("CSV neutralises spreadsheet formulas", async () => {
    rows.push({ id: "f9", userId: "u1", message: "=HYPERLINK(\"http://x\")", mood: null, page: null, createdAt: new Date() });
    const text = await (await admin.GET(areq("?format=csv"))).text();
    assert.ok(text.startsWith('"Date","Name"')); assert.ok(text.includes(`"'=HYPERLINK(""http://x"")"`));
  });
  console.log(results.join("\n")); console.log(fails ? `feedback-test: ${fails} FAILED` : "feedback-test: all passed"); process.exit(fails ? 1 : 0);
})();
