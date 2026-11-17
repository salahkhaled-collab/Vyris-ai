// In-app feedback: validation and the owner's notification email. Pure.

export const MOODS = ["bad", "ok", "great"] as const;
export type Mood = (typeof MOODS)[number];
export const MOOD_LABELS: Record<Mood, string> = { bad: "Not useful yet", ok: "It's okay", great: "Love it" };
export const MAX_MESSAGE = 2000;

export interface FeedbackInput {
  message: string;
  mood: Mood | null;
  page: string | null;
}

export function validateFeedback(raw: unknown): { ok: true; value: FeedbackInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "Send a JSON object." };
  const o = raw as Record<string, unknown>;
  const message = typeof o.message === "string" ? o.message.trim() : "";
  const mood = typeof o.mood === "string" && (MOODS as readonly string[]).includes(o.mood) ? (o.mood as Mood) : null;
  if (!message && !mood) return { ok: false, error: "Write something or pick how it's going." };
  if (message.length > MAX_MESSAGE) return { ok: false, error: `Keep it under ${MAX_MESSAGE} characters.` };
  // Only an app path is kept: no query strings, no outside URLs.
  const page = typeof o.page === "string" && /^\/[A-Za-z0-9/_-]{0,80}$/.test(o.page) ? o.page : null;
  return { ok: true, value: { message, mood, page } };
}
