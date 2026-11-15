// Built-in inbox sorting: works with no AI at all; the AI only refines it.
import assert from "node:assert/strict";
let me: any = { id: "u1", email: "salah@vyris.studio", name: "Salah" };
const naPath = require.resolve("next-auth");
require.cache[naPath] = { id: naPath, filename: naPath, loaded: true, exports: { getServerSession: async () => (me ? { user: me } : null) } } as unknown as NodeModule;

const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }
const mail = (o: any) => ({ id: "x", fromEmail: "Someone <someone@acme.co>", subject: "Hello", snippet: "", unread: true, labels: [], bulk: false, ...o });
const ctx = { mailbox: "salah@vyris.studio", contactEmails: new Set(["omar@atlasretail.co", "friend@gmail.com"]), projects: [{ id: "p1", title: "Atlas Retail" }, { id: "p2", title: "AI" }] };

(async () => {
  console.error = () => {};
  const { triageByRules } = require("@/lib/inbox-rules");
  const t = (o: any) => triageByRules(mail(o), ctx);

  await check("a contact asking a question needs a reply, as work", () => {
    const r = t({ fromEmail: "Omar <omar@atlasretail.co>", subject: "Q1 proposal", snippet: "Could you send the revised proposal by Thursday?" });
    assert.equal(r.priority, "needs_reply"); assert.equal(r.category, "work"); assert.equal(r.reason, "A contact is asking you something");
  });
  await check("urgent wording wins, English and Arabic, and is quoted in the reason", () => {
    assert.equal(t({ subject: "Need this ASAP" }).priority, "urgent"); assert.equal(t({ subject: "Need this ASAP" }).reason, 'Says "ASAP"');
    assert.equal(t({ snippet: "please send it by end of day" }).priority, "urgent");
    assert.equal(t({ subject: "مطلوب عاجل" }).priority, "urgent");
  });
  await check("Arabic requests count as asks", () => {
    assert.equal(t({ snippet: "ممكن تبعتلي العرض؟" }).priority, "needs_reply");
    assert.equal(t({ snippet: "هل الميعاد مناسب" }).priority, "needs_reply");
    assert.equal(t({ snippet: "المشهد هلال" }).priority, "fyi", "هل inside another word is not a question");
  });
  await check("'please find attached' is not a request", () => {
    assert.equal(t({ snippet: "Please find attached the deck." }).priority, "fyi");
  });
  await check("Gmail Promotions tab and newsletters go low, unless it's someone you know", () => {
    assert.deepEqual([t({ labels: ["CATEGORY_PROMOTIONS"] }).priority, t({ labels: ["CATEGORY_PROMOTIONS"] }).category], ["low", "promotions"]);
    assert.equal(t({ bulk: true, subject: "50% off this week only" }).category, "promotions");
    const known = t({ fromEmail: "Omar <omar@atlasretail.co>", labels: ["CATEGORY_PROMOTIONS"], snippet: "Can you review this?" });
    assert.equal(known.priority, "needs_reply", "a contact is never filed as a promotion");
  });
  await check("automated mail: security and failed payments are urgent; receipts are fyi; the rest low", () => {
    assert.equal(t({ fromEmail: "Google <no-reply@accounts.google.com>", subject: "Security alert" }).priority, "urgent");
    assert.equal(t({ fromEmail: "Stripe <notifications@stripe.com>", subject: "Your payment failed" }).priority, "urgent");
    const receipt = t({ fromEmail: "Stripe <receipts@stripe.com>", subject: "Your receipt from Vercel" });
    assert.deepEqual([receipt.priority, receipt.category], ["fyi", "work"]);
    assert.equal(t({ fromEmail: "LinkedIn <updates@linkedin.com>", labels: ["CATEGORY_SOCIAL"], subject: "You appeared in 9 searches" }).priority, "low");
    assert.equal(t({ fromEmail: "noreply@github.com", subject: "New comment?" }).priority, "low", "a ? from a robot isn't a question to you");
  });
  await check("work vs personal: contacts, your company and business domains are work; free mail is personal", () => {
    assert.equal(t({ fromEmail: "Mona <mona@vyris.studio>" }).category, "work");
    assert.equal(t({ fromEmail: "Mona <mona@vyris.studio>" }).reason, "Someone at your company, no question asked");
    assert.equal(t({ fromEmail: "Mom <mom@gmail.com>" }).category, "personal");
    assert.equal(t({ fromEmail: "Friend <friend@gmail.com>" }).category, "work", "contacts are always work, matching the AI override");
    assert.equal(t({ fromEmail: "x@newco.io" }).category, "work");
  });
  await check("project matched by name or sender company; 2-letter project names never match", () => {
    assert.equal(t({ subject: "Atlas Retail homepage" }).projectId, "p1");
    assert.equal(t({ fromEmail: "Omar <omar@atlasretail.co>", subject: "hi" }).projectId, "p1");
    assert.equal(t({ subject: "AI news for founders" }).projectId, null);
  });
  await check("Gmail Important + unread + someone you know = needs a reply", () => {
    assert.equal(t({ fromEmail: "Omar <omar@atlasretail.co>", labels: ["IMPORTANT"], snippet: "Notes from today." }).priority, "needs_reply");
    assert.equal(t({ fromEmail: "Omar <omar@atlasretail.co>", labels: ["IMPORTANT"], unread: false, snippet: "Notes from today." }).priority, "fyi");
  });

  // Route: rules always answer; AI refines; AI failures never surface as errors.
  process.env.PYTHON_LLM_URL = "http://fake-llm.local/v1/chat/completions";
  const { prisma } = require("@/lib/prisma");
  const D = (n: string, v: any) => Object.defineProperty(prisma, n, { value: v, configurable: true, writable: true });
  D("account", { findFirst: async () => ({ id: "a", access_token: "tok", expires_at: Math.floor(Date.now() / 1000) + 3600, scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send", refresh_token: "r" }) });
  D("user", { findUnique: async () => ({ id: "u1", name: "Salah", teamId: null }) });
  D("project", { findMany: async () => [{ id: "p1", title: "Atlas Retail" }] });
  D("contact", { findMany: async () => [{ email: "omar@atlasretail.co" }] });
  const gmailMsgs: any = {
    m1: { id: "m1", threadId: "t1", snippet: "Could you send the proposal?", internalDate: String(Date.now()), labelIds: ["INBOX", "UNREAD"], payload: { headers: [{ name: "From", value: "Omar <omar@atlasretail.co>" }, { name: "Subject", value: "Proposal" }] } },
    m2: { id: "m2", threadId: "t2", snippet: "Big sale", internalDate: String(Date.now() - 1000), labelIds: ["INBOX", "CATEGORY_PROMOTIONS"], payload: { headers: [{ name: "From", value: "Shop <deals@shop.com>" }, { name: "Subject", value: "50% off" }, { name: "List-Unsubscribe", value: "<mailto:u@shop.com>" }] } },
  };
  let llm: () => Response = () => new Response("down", { status: 503 });
  let llmCalls = 0;
  globalThis.fetch = (async (u: string) => {
    const url = String(u);
    if (url.includes("fake-llm")) { llmCalls++; return llm(); }
    if (url.includes("/profile")) return new Response(JSON.stringify({ emailAddress: "salah@vyris.studio" }), { status: 200 });
    if (url.includes("/messages?")) return new Response(JSON.stringify({ messages: [{ id: "m1" }, { id: "m2" }] }), { status: 200 });
    const m = url.match(/messages\/(m\d)/); if (m) return new Response(JSON.stringify(gmailMsgs[m[1]]), { status: 200 });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  const { POST } = require("@/app/api/ai/inbox/triage/route");
  const req = (body: unknown) => ({ json: async () => body }) as any;

  await check("AI down: rules sort everything, 200 with a notice, no error", async () => {
    const res = await POST(req({})); const d = await res.json();
    assert.equal(res.status, 200); assert.equal(d.source, "rules"); assert.match(d.notice, /built-in rules/);
    assert.equal(d.results.m1.priority, "needs_reply"); assert.equal(d.results.m2.priority, "low");
  });
  await check("AI rate-limited: rules, and the notice says when AI is back", async () => {
    llm = () => new Response("Rate limit reached. Please try again in 7.5s.", { status: 429 });
    const d = await (await POST(req({}))).json();
    assert.equal(d.source, "rules"); assert.match(d.notice, /back in about 8s/);
  });
  await check("AI junk reply: rules", async () => {
    llm = () => new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: "sorry" } }] }), { status: 200 });
    const d = await (await POST(req({}))).json(); assert.equal(d.source, "rules"); assert.equal(d.results.m2.category, "promotions");
  });
  await check("AI works: its results win; partial answers are filled by rules", async () => {
    llm = () => new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: JSON.stringify({ results: [{ id: "m1", priority: "urgent", category: "work", reason: "Client deadline", projectId: "p1" }] }) } }] }), { status: 200 });
    const d = await (await POST(req({}))).json();
    assert.equal(d.results.m1.priority, "urgent"); assert.equal(d.results.m1.reason, "Client deadline");
    assert.equal(d.results.m2.priority, "low", "missing from AI reply -> rules"); assert.ok(["mixed", "ai"].includes(d.source)); assert.equal(d.notice, null);
  });
  await check("no AI configured at all: still sorts (no 500)", async () => {
    delete process.env.PYTHON_LLM_URL; const before = llmCalls;
    const res = await POST(req({})); const d = await res.json();
    assert.equal(res.status, 200); assert.equal(d.source, "rules"); assert.equal(llmCalls, before, "AI not called");
    process.env.PYTHON_LLM_URL = "http://fake-llm.local/v1/chat/completions";
  });
  await check("needs a session and Gmail", async () => {
    me = null; assert.equal((await POST(req({}))).status, 401); me = { id: "u1", email: "salah@vyris.studio", name: "Salah" };
  });
  console.log(results.join("\n")); console.log(fails ? `inbox-rules-test: ${fails} FAILED` : "inbox-rules-test: all passed"); process.exit(fails ? 1 : 0);
})();
