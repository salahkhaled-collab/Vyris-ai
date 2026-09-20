export const WIDGET_IDS = ["objectives", "decisions", "risks", "bets", "projects"] as const;
export const DEFAULT_ORDER: string[] = [...WIDGET_IDS];

const isWidgetId = (s: string) => (WIDGET_IDS as readonly string[]).includes(s);

export function parseLayout(saved: string[]) {
  const hidden = saved
    .filter((s) => s.startsWith("hide:"))
    .map((s) => s.slice(5))
    .filter(isWidgetId);
  const visible = saved.filter(isWidgetId);
  const known = new Set([...visible, ...hidden]);
  const fresh = DEFAULT_ORDER.filter((w) => !known.has(w)); // newly shipped widgets appear automatically
  return { order: [...new Set([...visible, ...fresh])], hidden: [...new Set(hidden)] };
}

export function serializeLayout(order: string[], hidden: string[]) {
  return [...order, ...hidden.map((h) => `hide:${h}`)];
}

export function isValidLayout(v: unknown): v is string[] {
  if (!Array.isArray(v) || v.length > WIDGET_IDS.length) return false;
  if (!v.every((x) => typeof x === "string")) return false;
  const ids = (v as string[]).map((x) => (x.startsWith("hide:") ? x.slice(5) : x));
  return ids.every(isWidgetId) && new Set(ids).size === ids.length;
}