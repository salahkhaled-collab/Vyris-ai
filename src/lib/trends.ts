// src/lib/trends.ts
//
// "Unusual changes": today's workspace numbers compared with the user's own
// recent days. One snapshot per user per day (WorkspaceSnapshot) is written by
// the daily cron and whenever risk signals are loaded. Pure and client-safe.

export interface TrendMetrics {
  openTasks: number;
  overdue: number;
  blocked: number;
  /** Tasks marked done in the last 7 days (by last update time). */
  doneLast7: number;
  /** Tasks created in the last 7 days. */
  createdLast7: number;
}

export type TrendKey = keyof TrendMetrics;

export interface UnusualChange {
  metric: TrendKey;
  /** Plain sentence for the UI and the assistant. */
  label: string;
  today: number;
  /** Average of the earlier days compared against. */
  usual: number;
  /** "worse" means it moved in the direction a founder should worry about. */
  direction: "worse" | "better";
}

/** Earlier days needed before anything counts as unusual. */
export const MIN_HISTORY_DAYS = 3;
/** Compare with up to this many earlier days. */
export const HISTORY_DAYS = 7;

const RULES: { metric: TrendKey; worseWhen: "up" | "down"; minJump: number; noun: string }[] = [
  { metric: "overdue", worseWhen: "up", minJump: 3, noun: "overdue tasks" },
  { metric: "blocked", worseWhen: "up", minJump: 2, noun: "blocked tasks" },
  { metric: "openTasks", worseWhen: "up", minJump: 5, noun: "open tasks" },
  { metric: "createdLast7", worseWhen: "up", minJump: 5, noun: "new tasks this week" },
  { metric: "doneLast7", worseWhen: "down", minJump: 3, noun: "tasks finished this week" },
];

/**
 * Flags a metric when it moved by at least `minJump` AND by at least half of
 * its usual level, against the average of the previous days. Small, noisy
 * moves don't count. Only "worse" moves are reported for the down-is-bad
 * metric (finished work); for the others, a big drop is reported as "better".
 */
export function detectUnusualChanges(history: TrendMetrics[], today: TrendMetrics): UnusualChange[] {
  const recent = history.slice(-HISTORY_DAYS);
  if (recent.length < MIN_HISTORY_DAYS) return [];
  const out: UnusualChange[] = [];
  for (const rule of RULES) {
    const usual = recent.reduce((sum, h) => sum + h[rule.metric], 0) / recent.length;
    const now = today[rule.metric];
    const delta = now - usual;
    const big = Math.abs(delta) >= rule.minJump && Math.abs(delta) >= usual * 0.5;
    if (!big) continue;
    const up = delta > 0;
    const worse = rule.worseWhen === "up" ? up : !up;
    if (rule.worseWhen === "down" && !worse) continue; // finishing more isn't a warning
    const rounded = Math.round(usual * 10) / 10;
    out.push({
      metric: rule.metric,
      today: now,
      usual: rounded,
      direction: worse ? "worse" : "better",
      label: `${now} ${rule.noun}, ${up ? "up" : "down"} from about ${rounded} on a usual day`,
    });
  }
  // Worse first, biggest relative move first.
  return out.sort((a, b) => {
    if (a.direction !== b.direction) return a.direction === "worse" ? -1 : 1;
    const rel = (c: UnusualChange) => Math.abs(c.today - c.usual) / Math.max(c.usual, 1);
    return rel(b) - rel(a);
  });
}

/** "YYYY-MM-DD" in UTC: one snapshot row per user per day. */
export function snapshotDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}
