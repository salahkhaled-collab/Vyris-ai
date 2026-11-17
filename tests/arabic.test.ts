// Arabic: every AI writer answers in the source language; Arabic mail survives sending.
import assert from "node:assert/strict";
const results: string[] = []; let fails = 0;
async function check(name: string, fn: () => Promise<void> | void) { try { await fn(); results.push("PASS " + name); } catch (e: any) { fails++; results.push("FAIL " + name + " :: " + e.message); } }
(async () => {
  const L = require("@/lib/language");
  await check("assistant prompt answers in the user's language, tool inputs stay exact", () => {
    const { VYRIS_SYSTEM_PROMPT } = require("@/lib/ai/system-prompt");
    assert.match(VYRIS_SYSTEM_PROMPT, /reply in the language of the user's latest message/); assert.match(VYRIS_SYSTEM_PROMPT, /Egyptian or Gulf Arabic/);
    assert.match(VYRIS_SYSTEM_PROMPT, /ids and status values in English/);
  });
  await check("email replies, meeting briefs, meeting notes and drafts follow the source language", () => {
    const { threadPrompt } = require("@/lib/inbox-ai");
    assert.match(threadPrompt("Salah", null, []), /language of the most recent message from someone else/);
    const { BRIEF_PROMPT } = require("@/lib/meeting-brief"); assert.match(BRIEF_PROMPT, /Language: write in the language of the meeting title/);
    const { meetingNotesPrompt } = require("@/lib/meeting-notes"); assert.match(meetingNotesPrompt("2026-11-14", []), /language of the meeting notes/);
    const { updatePrompt } = require("@/lib/founder-update"); assert.match(updatePrompt("investors", null), /same language as the founder's note/);
  });
  await check("Arabic reply round-trips through the Gmail raw message", () => {
    const { buildRawMessage, decodeBase64Url } = require("@/lib/gmail");
    const raw = buildRawMessage({ to: "omar@acme.co", subject: "رد: عرض السعر", body: "أهلاً عمر،\nهبعتلك العرض يوم الخميس.\nصلاح" });
    const text = decodeBase64Url(raw);
    assert.match(text, /charset=utf-8/); assert.ok(text.includes("هبعتلك العرض يوم الخميس."));
    const m = /Subject: =\?UTF-8\?B\?([^?]+)\?=/.exec(text); assert.ok(m, "subject is MIME-encoded");
    assert.equal(Buffer.from(m![1], "base64").toString("utf-8"), "رد: عرض السعر");
  });
  await check("Arabic summary, promises and dates parse unchanged", () => {
    const { parseThreadSummary } = require("@/lib/inbox-ai");
    const s = parseThreadSummary(JSON.stringify({ summary: "عمر عايز العرض المعدّل.", keyPoints: ["الموعد: الخميس"], needsReply: true, replyDraft: "أهلاً عمر، هبعته الخميس.",
      commitments: [{ text: "إرسال العرض المعدّل", direction: "MINE", counterpart: "عمر", dueDate: "2026-11-19" }] }));
    assert.equal(s.summary, "عمر عايز العرض المعدّل."); assert.equal(s.commitments[0].text, "إرسال العرض المعدّل"); assert.equal(s.commitments[0].counterpart, "عمر");
  });
  await check("morning brief keeps Arabic titles intact", () => {
    const { buildBrief, briefEmail } = require("@/lib/morning-brief");
    const b = buildBrief({ report: { overdue: [], blocked: [{ taskId: "t", projectId: "p", dueDate: null, title: "تصميم الشعار", projectTitle: "نورث ويند", blockedReason: "موافقة العميل" }], dueSoon: [], idleProjects: [], total: 1 },
      meetings: null, unanswered: null, changes: [], goals: [], now: new Date("2026-11-15T05:00:00Z"), timeZone: "Africa/Cairo" });
    assert.ok(briefEmail(b, new Date("2026-11-15T05:00:00Z"), "Africa/Cairo", "https://v").body.includes('Unblock "تصميم الشعار" (نورث ويند). Blocked: موافقة العميل.'));
  });
  console.log(results.join("\n")); console.log(fails ? `arabic-test: ${fails} FAILED` : "arabic-test: all passed"); process.exit(fails ? 1 : 0);
})();
