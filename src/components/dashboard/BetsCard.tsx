"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Bet = { id: string; title: string; status: string };

const ORDER = ["ON_TRACK", "AT_RISK", "OFF_TRACK"];
const BAR: Record<string, string> = {
  ON_TRACK: "bg-signal",
  AT_RISK: "bg-brass",
  OFF_TRACK: "bg-red-500",
};
const TEXT: Record<string, string> = {
  ON_TRACK: "text-signal",
  AT_RISK: "text-brass",
  OFF_TRACK: "text-red-500",
};

const label = (s: string) => s.replace("_", " ").toLowerCase();

export function BetsCard() {
  const [items, setItems] = useState<Bet[] | null>(null);

  useEffect(() => {
    fetch("/api/strategic-bets")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? (d as Bet[]) : []))
      .catch(() => setItems([]));
  }, []);

  if (items === null) return <p className="text-xs text-muted">Loading...</p>;
  if (items.length === 0) return <p className="text-xs text-muted">No strategic bets yet.</p>;

  const counts = ORDER.map((s) => ({ s, n: items.filter((b) => b.status === s).length }));

  return (
    <div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-panel-2 mb-1.5">
        {counts.map(({ s, n }) =>
          n > 0 ? <div key={s} className={BAR[s]} style={{ width: `${(n / items.length) * 100}%` }} /> : null
        )}
      </div>
      <p className="text-xs text-muted mb-4">
        {counts.filter((c) => c.n > 0).map((c) => `${c.n} ${label(c.s)}`).join(" · ")}
      </p>
      <div className="space-y-2">
        {items.slice(0, 4).map((b) => (
          <div key={b.id} className="flex items-center justify-between text-sm">
            <span className="truncate">{b.title}</span>
            <span className={cn("text-xs shrink-0 ml-2", TEXT[b.status] ?? "text-muted")}>
              {label(b.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}