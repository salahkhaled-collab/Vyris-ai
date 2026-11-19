// Phone redesign helpers: greeting and dates in the user's zone, sender names, chip colours,
// the next meeting, project next steps, and the Ask Vyris event.
import assert from "node:assert/strict";
const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }

(async () => {
  const T = require("@/lib/today-view");
  const P = require("@/lib/project-view");
  await check("greeting and date follow the user's zone, not the server's", () => {
    const at = new Date("2026-11-20T04:30:00Z"); // 06:30 Cairo, 23:30 New York the day before
    assert.equal(T.greeting(at, "Africa/Cairo"), "Good morning");
    assert.equal(T.greeting(at, "America/New_York"), "Good evening");
    assert.equal(T.greeting(new Date("2026-11-20T13:00:00Z"), "Africa/Cairo"), "Good afternoon");
    assert.match(T.dateLabel(at, "Africa/Cairo"), /^FRIDAY.*20 NOVEMBER$/);
    assert.match(T.dateLabel(at, "America/New_York"), /^THURSDAY.*19 NOVEMBER$/);
    assert.equal(T.greeting(at, "Not/AZone").length > 0, true, "bad zone doesn't crash");
  });
  await check("names and initials, including Arabic and bare addresses", () => {
    assert.equal(T.senderName('"Omar Haddad" <omar@atlas.com>'), "Omar Haddad");
    assert.equal(T.senderName("sara.nabil@northwind.io"), "sara.nabil");
    assert.equal(T.initials("Omar Haddad"), "OH"); assert.equal(T.initials("sara.nabil"), "SN"); assert.equal(T.initials("كريم صالح"), "كص");
    assert.equal(T.initials(""), "?"); assert.equal(T.firstName("Salah Khaled"), "Salah"); assert.equal(T.firstName(null), "");
  });
  await check("chip colours: late/blocked amber, someone waiting wine, rest neutral", () => {
    assert.deepEqual(["blocked", "overdue", "reply", "promise", "meeting", "due"].map(T.focusTone), ["warn", "warn", "brand", "brand", "neutral", "neutral"]);
  });
  await check("next meeting: soonest timed one not yet over; all-day ignored", () => {
    const now = new Date("2026-11-20T09:00:00Z");
    const m = (start: string, allDay = false) => ({ title: start, start, allDay, attendees: [], project: null });
    assert.equal(T.nextMeeting([m("2026-11-20"), m("2026-11-20T12:00:00Z"), m("2026-11-20T08:30:00Z")], now).start, "2026-11-20T08:30:00Z", "started 30 min ago, still on");
    assert.equal(T.nextMeeting([m("2026-11-20T07:00:00Z")], now), null, "over");
    assert.equal(T.nextMeeting(null, now), null);
    assert.equal(T.startsIn("2026-11-20T11:00:00Z", now), "in 2 hours"); assert.equal(T.startsIn("2026-11-20T09:25:00Z", now), "in 25 min"); assert.equal(T.startsIn("2026-11-20T08:00:00Z", now), "now");
  });
  await check("project next step: blocked first, then late, then soonest; none when all done", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    const t = (title: string, status: string, dueDate: string | null = null, blockedReason: string | null = null) => ({ title, status, dueDate, blockedReason });
    assert.deepEqual(P.nextStep([t("A", "TODO", "2026-11-25"), t("Logo", "BLOCKED", null, "client approval")], now), { text: "Blocked: Logo (client approval)", tone: "warn" });
    assert.deepEqual(P.nextStep([t("Later", "TODO", "2026-11-28"), t("Copy", "IN_PROGRESS", "2026-11-22")], now), { text: "Next: Copy · due Sun 22 Nov", tone: "muted" });
    assert.equal(P.nextStep([t("Hire", "TODO", "2026-11-15")], now).text, "Late: Hire · was due Sun 15 Nov");
    assert.deepEqual(P.nextStep([t("Undated", "TODO")], now), { text: "Next: Undated", tone: "muted" });
    assert.equal(P.nextStep([t("x", "DONE")], now), null);
    assert.equal(P.percentDone([t("a", "DONE"), t("b", "TODO"), t("c", "TODO")]), 33); assert.equal(P.percentDone([]), 0);
  });
  await check("Ask Vyris event carries a prompt and a close", () => {
    const seen: any[] = [];
    (globalThis as any).window = { dispatchEvent: (e: any) => seen.push(e.detail) };
    (globalThis as any).CustomEvent = class { type: string; detail: any; constructor(t: string, i: any) { this.type = t; this.detail = i?.detail; } };
    const A = require("@/lib/ask-vyris");
    A.openAskVyris({ prompt: "Prep me" }); A.closeAskVyris(); A.openAskVyris({ toggle: true });
    assert.deepEqual(seen, [{ prompt: "Prep me" }, { close: true }, { toggle: true }]);
  });
  console.log(results.join("\n")); console.log(fails ? `mobile-test: ${fails} FAILED` : "mobile-test: all passed"); process.exit(fails ? 1 : 0);
})();
