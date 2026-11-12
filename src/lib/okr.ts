// src/lib/okr.ts
//
// Objective progress and pace. Pure and client-safe.
// Progress is derived from key results and never stored.

export interface KeyResultLike {
  current: number;
  target: number;
}

/** Average completion of the key results, each capped at 100%, as a whole percentage. */
export function computeProgress(keyResults: KeyResultLike[]): number {
  if (keyResults.length === 0) return 0;
  // Each key result counts between 0% and 100%; bad numbers count as 0%.
  const pcts = keyResults.map((kr) => {
    const p = kr.target === 0 ? 0 : kr.current / kr.target;
    return Number.isFinite(p) ? Math.min(Math.max(p, 0), 1) : 0;
  });
  const avg = pcts.reduce((sum, p) => sum + p, 0) / pcts.length;
  return Math.round(avg * 100);
}

/** Parse "Q4-2026", "Q4 2026" or "2026-Q4" into UTC start and end instants. */
export function quarterBounds(quarter: string): { start: Date; end: Date } | null {
  const text = quarter.trim();
  const a = /^Q([1-4])[\s_-]*(\d{4})$/i.exec(text);
  const b = /^(\d{4})[\s_-]*Q([1-4])$/i.exec(text);
  const q = a ? Number(a[1]) : b ? Number(b[2]) : null;
  const year = a ? Number(a[2]) : b ? Number(b[1]) : null;
  if (q === null || year === null) return null;
  const start = new Date(Date.UTC(year, (q - 1) * 3, 1));
  const end = new Date(Date.UTC(year, q * 3, 1));
  return { start, end };
}

/** Points of progress an objective may trail its time-based expectation before it counts as behind. */
export const PACE_TOLERANCE = 15;

export interface ObjectivePace {
  progress: number;
  /** Share of the quarter elapsed, as a whole percentage. */
  expected: number;
  behind: boolean;
  /** The quarter is over and the objective did not reach 100%. */
  missed: boolean;
}

/**
 * Compare progress with how much of the quarter has passed.
 * Returns null when the quarter can't be parsed, hasn't started, or there are no key results.
 */
export function objectivePace(quarter: string, keyResults: KeyResultLike[], now: Date): ObjectivePace | null {
  const bounds = quarterBounds(quarter);
  if (!bounds || keyResults.length === 0 || now < bounds.start) return null;
  const progress = computeProgress(keyResults);
  const span = bounds.end.getTime() - bounds.start.getTime();
  const elapsed = Math.min(1, (now.getTime() - bounds.start.getTime()) / span);
  const expected = Math.round(elapsed * 100);
  const missed = now >= bounds.end && progress < 100;
  return { progress, expected, behind: missed || expected - progress > PACE_TOLERANCE, missed };
}
