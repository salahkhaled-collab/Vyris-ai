// src/lib/language.ts
//
// Arabic support: the AI answers in the language it is spoken or written to,
// and Arabic text is laid out right-to-left. Pure and client-safe. The UI
// itself stays English for now; user content (emails, tasks, notes, replies)
// shows in whichever direction its own text needs via dir="auto".

/** For the assistant: answer in the user's language, keep tool inputs exact. */
export const ASSISTANT_LANGUAGE_RULE = [
  "- Language: reply in the language of the user's latest message. If they write in Arabic, reply in Arabic,",
  "  matching their register (Egyptian or Gulf Arabic if they wrote that way, Modern Standard Arabic otherwise).",
  "  If they write Arabic in Latin letters (\"3ayez a3raf\"), reply the same way. Tool inputs stay exact:",
  "  ids and status values in English, and names and titles copied as stored, in whatever language they are.",
].join("\n");

/** For drafts written to someone in an email thread. */
export const THREAD_LANGUAGE_RULE =
  "- Language: write summary, keyPoints, replyDraft and each commitment's text in the language of the most recent message from someone else. For Arabic, match their register: Egyptian Arabic if they wrote Egyptian, Modern Standard Arabic otherwise. Sign off the way people do in that language.";

/** For text built from data the user wrote (meeting notes, a rough note). */
export function sourceLanguageRule(what: string): string {
  return `- Language: write in the language of ${what}. If it is Arabic, write Arabic (same register); if it mixes languages, use the main one.`;
}
