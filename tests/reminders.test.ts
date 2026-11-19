// Calendar reminders vs meetings: classification, creating a reminder in Google, and where each shows up.
import assert from "node:assert/strict";
let me: any = { id: "u1", email: "u1@x.co" };
const naPath = require.resolve("next-auth");
require.cache[naPath] = { id: naPath, filename: naPath, loaded: true, exports: { getServerSession: async () => (me ? { user: me } : null) } } as unknown as NodeModule;
const gtPath = require.resolve("@/lib/google-token");
require.cache[gtPath] = { id: gtPath, filename: gtPath, loaded: true, exports: { getGoogleAccessToken: async () => ({ accessToken: "tok" }) } } as unknown as NodeModule;
const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }

(async () => {
  console.error = () => {};
  const K = require("@/lib/event-kind");
  await check("a meeting has other people or a video link; anything else is a reminder; Vyris tags win", () => {
    assert.equal(K.eventKind({ attendees: [{ email: "me@x.co", self: true }, { email: "omar@atlas.com" }] }), "meeting");
    assert.equal(K.eventKind({ hangoutLink: "https://meet.google.com/abc" }), "meeting");
    assert.equal(K.eventKind({ conferenceData: { entryPoints: [] } }), "meeting");
    assert.equal(K.eventKind({}), "reminder", "Pay rent");
    assert.equal(K.eventKind({ attendees: [{ email: "me@x.co", self: true }, { email: "room@x.co", resource: true }] }), "reminder", "just me and a room");
    assert.equal(K.eventKind({ attendees: [{ email: "o@a.com" }], extendedProperties: { private: { vyrisKind: "reminder" } } }), "reminder");
  });
  await check("15 minutes later, wall-clock and with offsets, across midnight", () => {
    assert.equal(K.addMinutesWallClock("2026-11-20T15:00:00", 15), "2026-11-20T15:15:00");
    assert.equal(K.addMinutesWallClock("2026-11-20T23:50", 15), "2026-11-21T00:05:00");
    assert.equal(K.addMinutesWallClock("2026-11-20T15:00:00+02:00", 15), "2026-11-20T13:15:00.000Z");
  });
  await check("input: kind defaults to meeting (old callers), reminder when asked", () => {
    const { parseEventInput } = require("@/lib/calendar-events");
    const base = { title: "Pay rent", startTime: "2026-11-20T15:00:00", timeZone: "Africa/Cairo" };
    assert.equal(parseEventInput(base).kind, "meeting");
    assert.equal(parseEventInput({ ...base, kind: "reminder" }).kind, "reminder");
    assert.equal(parseEventInput({ ...base, kind: "party" }).kind, "meeting");
  });

  const sent: any[] = [];
  (globalThis as any).fetch = async (url: string, init: any) => {
    sent.push({ url, init });
    if (init?.method === "POST") return new Response(JSON.stringify({ id: "ev1", htmlLink: "x" }), { status: 200 });
    return new Response(JSON.stringify({ items: [
      { id: "a", summary: "Atlas review", start: { dateTime: "2026-11-20T09:30:00Z" }, end: { dateTime: "2026-11-20T10:00:00Z" }, attendees: [{ email: "me@x.co", self: true }, { email: "sara@atlas.com" }] },
      { id: "b", summary: "Pay rent", start: { dateTime: "2026-11-20T13:00:00Z" }, end: { dateTime: "2026-11-20T13:15:00Z" }, extendedProperties: { private: { vyrisKind: "reminder" } } },
      { id: "c", summary: "Gym", start: { dateTime: "2026-11-20T16:00:00Z" }, end: { dateTime: "2026-11-20T17:00:00Z" } } ] }), { status: 200 });
  };
  const eventsApi = require("@/app/api/calendar/events/route");
  const post = (b: any) => eventsApi.POST({ json: async () => b } as any);
  await check("creating a reminder: pop-up at the time, 15 minutes, doesn't block the day, tagged", async () => {
    const r = await post({ kind: "reminder", title: "Pay rent", startTime: "2026-11-20T15:00:00", endTime: "2026-11-20T15:00:00", timeZone: "Africa/Cairo" });
    assert.equal(r.status === 200 || r.status === 201, true);
    const body = JSON.parse(sent[sent.length - 1].init.body);
    assert.deepEqual(body.start, { dateTime: "2026-11-20T15:00:00", timeZone: "Africa/Cairo" });
    assert.deepEqual(body.end, { dateTime: "2026-11-20T15:15:00", timeZone: "Africa/Cairo" });
    assert.equal(body.transparency, "transparent");
    assert.deepEqual(body.reminders, { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] });
    assert.equal(body.extendedProperties.private.vyrisKind, "reminder");
  });
  await check("creating a meeting keeps start and end, blocks time, tagged meeting", async () => {
    await post({ kind: "meeting", title: "Call with Atlas", startTime: "2026-11-20T10:00:00", endTime: "2026-11-20T11:00:00", timeZone: "Africa/Cairo" });
    const body = JSON.parse(sent[sent.length - 1].init.body);
    assert.equal(body.end.dateTime, "2026-11-20T11:00:00"); assert.equal(body.transparency, undefined); assert.equal(body.extendedProperties.private.vyrisKind, "meeting");
  });
  await check("all-day reminder uses Google's default alert", async () => {
    await post({ kind: "reminder", title: "Mum's birthday", startTime: "2026-11-20", allDay: true });
    const body = JSON.parse(sent[sent.length - 1].init.body);
    assert.deepEqual(body.start, { date: "2026-11-20" }); assert.deepEqual(body.reminders, { useDefault: true });
  });
  await check("calendar list labels each event", async () => {
    const api = require("@/app/api/calendar/route");
    const r = await api.GET({ nextUrl: new URL("http://x/api/calendar?range=month&tz=Africa/Cairo") } as any);
    const d = await r.json();
    assert.deepEqual(d.events.map((e: any) => [e.title, e.kind]), [["Atlas review", "meeting"], ["Pay rent", "reminder"], ["Gym", "reminder"]]);
  });

  const T = require("@/lib/today-view");
  const B = require("@/lib/morning-brief");
  const P = require("@/lib/push");
  const now = new Date("2026-11-20T07:00:00Z");
  const items = [
    { title: "Pay rent", start: "2026-11-20T13:00:00Z", allDay: false, attendees: [], project: null, kind: "reminder" },
    { title: "Atlas review", start: "2026-11-20T09:30:00Z", allDay: false, attendees: ["s@a.com"], project: null, kind: "meeting" },
    { title: "Mum's birthday", start: "2026-11-20", allDay: true, attendees: [], project: null, kind: "reminder" },
    { title: "Old item", start: "2026-11-20T08:00:00Z", allDay: false, attendees: [], project: null }, // no kind = meeting
  ];
  await check("next meeting skips reminders; reminders listed all-day first then by time", () => {
    assert.equal(T.nextMeeting(items, now).title, "Old item");
    assert.equal(T.nextMeeting(items.filter((m) => m.title !== "Old item"), now).title, "Atlas review");
    assert.deepEqual(T.remindersToday(items).map((m: any) => m.title), ["Mum's birthday", "Pay rent"]);
  });
  const brief = B.buildBrief({ report: { overdue: [], blocked: [], dueSoon: [], idleProjects: [], total: 0 }, meetings: items, unanswered: [], changes: [], goals: [], commitments: [], now, timeZone: "Africa/Cairo" });
  await check("email: reminders get their own section, not listed as meetings", () => {
    const { body } = B.briefEmail(brief, now, "Africa/Cairo", "https://vyris.vercel.app");
    const rem = body.indexOf("REMINDERS TODAY"); const meet = body.indexOf("MEETINGS TODAY");
    assert.ok(rem >= 0 && meet > rem);
    const meetingsPart = body.slice(meet);
    assert.ok(!/Pay rent/.test(meetingsPart.split("\n\n")[0]), "Pay rent isn't under Meetings");
    assert.match(body.slice(rem, meet), /3:00 PM: Pay rent/);
  });
  await check("notification: a reminder is called a reminder", () => {
    const p = P.morningPush(B.buildBrief({ report: { overdue: [], blocked: [], dueSoon: [], idleProjects: [], total: 0 }, meetings: [items[0]], unanswered: [], changes: [], goals: [], commitments: [], now, timeZone: "Africa/Cairo" }), "Africa/Cairo");
    assert.match(p.body, /Reminder 3:00 PM: Pay rent/); assert.doesNotMatch(p.body, /Meeting/);
  });
  console.log(results.join("\n")); console.log(fails ? `reminders-test: ${fails} FAILED` : "reminders-test: all passed"); process.exit(fails ? 1 : 0);
})();
