"use client";

import { Panel } from "@/components/ui/Panel";
import { TrendingUp, TrendingDown } from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

const DAILY = [
  41, 38, 52, 47, 61, 44, 39, 55, 63, 48,
  57, 71, 66, 49, 58, 74, 69, 82,
  78, 84, 76, 91, 88, 80, 95, 90, 86, 98, 102, 97,
];

const TODAY_IDX   = 17;
const MONTHLY_TARGET = 2_100;
const MTD_ACTUAL     = DAILY.slice(0, TODAY_IDX + 1).reduce((s, v) => s + v, 0);
const PROJECTED_EOD  = (MTD_ACTUAL / (TODAY_IDX + 1)) * 30;
const PREV_MTD       = 1_047;

const pacePercent  = Math.round((MTD_ACTUAL / MONTHLY_TARGET) * 100);
const vsTarget     = MTD_ACTUAL - (MONTHLY_TARGET * ((TODAY_IDX + 1) / 30));
const vsLastMonth  = ((MTD_ACTUAL - PREV_MTD) / PREV_MTD) * 100;
const onTrack      = vsTarget >= 0;

function fmt(k: number) {
  if (k >= 1000) return `$${(k / 1000).toFixed(1)}M`;
  return `$${Math.round(k)}K`;
}

// Token-matched colors for raw SVG (can't use Tailwind classes on fill/stroke)
const BRASS = "#a89478";
const SIGNAL = "#5a9e7a";

function Sparkline() {
  const W = 440;
  const H = 80;
  const PAD = 4;
  const all = DAILY;
  const max = Math.max(...all) * 1.08;
  const min = 0;

  const x = (i: number) => PAD + (i / (all.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);

  const actualPts = all.slice(0, TODAY_IDX + 1).map((v, i) => `${x(i)},${y(v)}`).join(" L ");
  const actualPath = `M ${actualPts}`;

  const projStart = { x: x(TODAY_IDX), y: y(all[TODAY_IDX]) };
  const projPts = all.slice(TODAY_IDX).map((v, i) => `${x(TODAY_IDX + i)},${y(v)}`).join(" L ");
  const projPath = `M ${projPts}`;

  const areaPath = `M ${actualPts} L ${x(TODAY_IDX)},${H - PAD} L ${PAD},${H - PAD} Z`;

  const targetY = y((MONTHLY_TARGET / 30) * (TODAY_IDX + 1));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: "80px" }}
    >
      <defs>
        <linearGradient id="rev-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRASS} stopOpacity="0.25" />
          <stop offset="100%" stopColor={BRASS} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill="url(#rev-area)" />

      <path
        d={projPath}
        fill="none"
        stroke={BRASS}
        strokeWidth="1.5"
        strokeDasharray="4 3"
        strokeOpacity="0.4"
      />

      <path
        d={actualPath}
        fill="none"
        stroke={BRASS}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <line
        x1={PAD}
        y1={targetY}
        x2={x(TODAY_IDX)}
        y2={targetY}
        stroke={SIGNAL}
        strokeWidth="1"
        strokeDasharray="3 3"
        strokeOpacity="0.5"
      />

      <circle cx={projStart.x} cy={projStart.y} r="4" fill={BRASS} />
      <circle cx={projStart.x} cy={projStart.y} r="7" fill={BRASS} fillOpacity="0.2" />
    </svg>
  );
}

function WeekBars() {
  const last7 = DAILY.slice(TODAY_IDX - 6, TODAY_IDX + 1);
  const max7   = Math.max(...last7);
  const days   = ["M", "T", "W", "T", "F", "S", "S"];
  const today  = 6;

  return (
    <div className="flex items-end gap-1 h-10">
      {last7.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={i === today ? "bg-brass rounded-sm w-full" : "bg-line rounded-sm w-full"}
            style={{ height: `${Math.round((v / max7) * 36)}px` }}
          />
          <span className="text-[9px] font-mono text-muted">{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenuePacePanel() {
  return (
    <Panel className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Revenue Pace</div>
          <div className="font-display text-3xl mt-1">{fmt(MTD_ACTUAL)}</div>
          <div className="text-xs text-muted mt-0.5">MTD · {fmt(MONTHLY_TARGET)} target</div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              onTrack ? "bg-signal/10 text-signal" : "bg-signal/5 text-muted"
            }`}
          >
            {onTrack ? (
              <TrendingUp className="w-3 h-3" strokeWidth={2} />
            ) : (
              <TrendingDown className="w-3 h-3" strokeWidth={2} />
            )}
            {onTrack ? "+" : ""}{fmt(Math.abs(vsTarget))} vs pace
          </div>
          <div className="text-[11px] text-muted">
            <span className={vsLastMonth >= 0 ? "text-signal" : "text-signal/50"}>
              {vsLastMonth >= 0 ? "▲" : "▼"} {Math.abs(vsLastMonth).toFixed(1)}%
            </span>{" "}
            vs last month
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted">{pacePercent}% of monthly target</span>
          <span className="text-muted font-mono">
            {fmt(MONTHLY_TARGET - MTD_ACTUAL)} remaining
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brass/70 to-brass transition-all duration-700"
            style={{ width: `${Math.min(pacePercent, 100)}%` }}
          />
        </div>
        <div className="relative h-1">
          <div
            className="absolute -top-3 w-0.5 h-4 bg-signal/50 rounded-full"
            style={{ left: `${Math.round(((TODAY_IDX + 1) / 30) * 100)}%` }}
          />
        </div>
      </div>

      <div className="pt-1">
        <Sparkline />
        <div className="flex justify-between text-[10px] text-muted mt-1 font-mono">
          <span>Jun 1</span>
          <span className="text-brass">Today</span>
          <span>Jun 30</span>
        </div>
      </div>

      <div className="border-t border-line" />

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted mb-2">Last 7 Days</div>
          <WeekBars />
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">Projected EOM</div>
          <div className="font-display text-xl text-signal">{fmt(PROJECTED_EOD)}</div>
          <div className="text-[11px] text-muted mt-0.5">
            {PROJECTED_EOD >= MONTHLY_TARGET
              ? `+${fmt(PROJECTED_EOD - MONTHLY_TARGET)} above target`
              : `${fmt(MONTHLY_TARGET - PROJECTED_EOD)} short`}
          </div>
        </div>
      </div>
    </Panel>
  );
}