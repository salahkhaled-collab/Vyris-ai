// src/lib/investor-metrics.ts
//
// The numbers an investor asks for, computed from real data: sign-ups,
// activation, daily/weekly/monthly active users, week-by-week retention by
// sign-up cohort, and waitlist size. Pure: the server gathers rows, this
// counts them. Days and weeks are UTC (weeks start Monday) so the numbers are
// the same whoever looks at them.

export const WEEKS = 8;
const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" in UTC. */
export function dayKey(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** Monday 00:00 UTC of the week containing `at`. */
export function weekStart(at: Date): Date {
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(d.getTime() - dow * DAY_MS);
}

export interface MetricsUser {
  id: string;
  createdAt: Date;
  /** Connected Gmail or Calendar, created a project, or used the assistant. */
  activated: boolean;
  /** Granted Gmail access. Optional: older callers count it as no. */
  gmail?: boolean;
  /** Has the morning brief turned on. */
  brief?: boolean;
}

/** The first-week path, as counts of users who reached each step. */
export interface FunnelStep {
  key: "signed_up" | "gmail" | "brief" | "returned";
  label: string;
  users: number;
  /** Out of how many could have reached it (for "returned", only users signed up 7+ days ago). */
  of: number;
}

export interface MetricsInput {
  now: Date;
  users: MetricsUser[];
  /** Days each user did something in the app ("YYYY-MM-DD", UTC). */
  activeDays: Map<string, Set<string>>;
  waitlist: Date[];
}

export interface WeekRow {
  /** Monday, "YYYY-MM-DD". */
  week: string;
  signups: number;
  waitlist: number;
  activeUsers: number;
}

export interface CohortRow {
  week: string;
  size: number;
  /** Share of the cohort active in week +1..+4 after signing up; null = that week hasn't ended yet. */
  retained: (number | null)[];
}

export interface InvestorMetrics {
  generatedAt: string;
  totals: {
    users: number;
    activated: number;
    waitlist: number;
    dau: number;
    wau: number;
    mau: number;
  };
  weeks: WeekRow[];
  cohorts: CohortRow[];
  funnel: FunnelStep[];
  /** Payments aren't built yet; the page says so instead of showing a made-up zero. */
  paying: { configured: false };
}

function activeBetween(days: Set<string> | undefined, from: Date, to: Date): boolean {
  if (!days) return false;
  const a = dayKey(from);
  const b = dayKey(new Date(to.getTime() - 1));
  for (const d of days) if (d >= a && d <= b) return true;
  return false;
}

export function computeMetrics(input: MetricsInput): InvestorMetrics {
  const { now, users, activeDays, waitlist } = input;
  const countActive = (from: Date, to: Date) => users.filter((u) => activeBetween(activeDays.get(u.id), from, to)).length;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(now.getTime() + 1);

  const thisWeek = weekStart(now);
  const weeks: WeekRow[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const from = new Date(thisWeek.getTime() - i * 7 * DAY_MS);
    const to = new Date(from.getTime() + 7 * DAY_MS);
    weeks.push({
      week: dayKey(from),
      signups: users.filter((u) => u.createdAt >= from && u.createdAt < to).length,
      waitlist: waitlist.filter((w) => w >= from && w < to).length,
      activeUsers: countActive(from, to),
    });
  }

  const cohorts: CohortRow[] = weeks.map((w) => {
    const from = new Date(`${w.week}T00:00:00.000Z`);
    const to = new Date(from.getTime() + 7 * DAY_MS);
    const members = users.filter((u) => u.createdAt >= from && u.createdAt < to);
    const retained = [1, 2, 3, 4].map((k) => {
      const wFrom = new Date(from.getTime() + k * 7 * DAY_MS);
      const wTo = new Date(wFrom.getTime() + 7 * DAY_MS);
      if (wTo > now || members.length === 0) return null;
      const n = members.filter((u) => activeBetween(activeDays.get(u.id), wFrom, wTo)).length;
      return Math.round((n / members.length) * 100);
    });
    return { week: w.week, size: members.length, retained };
  });

  // Came back: active on any day at least 7 days after signing up. Only users
  // whose 7 days have passed can count, so new sign-ups don't drag it down.
  const eligible = users.filter((u) => u.createdAt.getTime() + 7 * DAY_MS <= now.getTime());
  const returned = eligible.filter((u) => {
    const days = activeDays.get(u.id);
    if (!days) return false;
    const from = dayKey(new Date(u.createdAt.getTime() + 7 * DAY_MS));
    for (const d of days) if (d >= from) return true;
    return false;
  }).length;
  const funnel: FunnelStep[] = [
    { key: "signed_up", label: "Signed up", users: users.length, of: users.length },
    { key: "gmail", label: "Connected Gmail", users: users.filter((u) => u.gmail).length, of: users.length },
    { key: "brief", label: "Morning brief on", users: users.filter((u) => u.brief).length, of: users.length },
    { key: "returned", label: "Came back after a week", users: returned, of: eligible.length },
  ];

  return {
    generatedAt: now.toISOString(),
    totals: {
      users: users.length,
      activated: users.filter((u) => u.activated).length,
      waitlist: waitlist.length,
      dau: countActive(today, end),
      wau: countActive(new Date(now.getTime() - 7 * DAY_MS), end),
      mau: countActive(new Date(now.getTime() - 30 * DAY_MS), end),
    },
    weeks,
    cohorts,
    funnel,
    paying: { configured: false },
  };
}

/** Metrics as CSV, for a data room or a spreadsheet. */
export function metricsCsv(m: InvestorMetrics): string {
  const rows = [
    ["Metric", "Value"],
    ["Generated", m.generatedAt],
    ["Users", String(m.totals.users)],
    ["Activated users", String(m.totals.activated)],
    ["Waitlist", String(m.totals.waitlist)],
    ["Daily active (today, UTC)", String(m.totals.dau)],
    ["Weekly active (last 7 days)", String(m.totals.wau)],
    ["Monthly active (last 30 days)", String(m.totals.mau)],
    ["Paying users", "Payments not set up yet"],
    [],
    ["First-week step", "Users", "Out of"],
    ...m.funnel.map((f) => [f.label, String(f.users), String(f.of)]),
    [],
    ["Week (Mon, UTC)", "Sign-ups", "Waitlist joins", "Active users"],
    ...m.weeks.map((w) => [w.week, String(w.signups), String(w.waitlist), String(w.activeUsers)]),
    [],
    ["Cohort week", "Size", "Week 1 %", "Week 2 %", "Week 3 %", "Week 4 %"],
    ...m.cohorts.map((c) => [c.week, String(c.size), ...c.retained.map((r) => (r === null ? "" : String(r)))]),
  ];
  return rows.map((r) => r.join(",")).join("\n");
}
