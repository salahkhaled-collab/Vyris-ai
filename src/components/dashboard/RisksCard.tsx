"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type Risk = { id: string; title: string; severity: Severity; status: string };

const ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const COLOR: Record<Severity, string> = {
  CRITICAL: "bg-red-600",
  HIGH: "bg-red-500",
  MEDIUM: "bg-brass",
  LOW: "bg-muted",
};

export function RisksCard() {
  const [items, setItems] = useState<Risk[] | null>(null);

  useEffect(() => {
    fetch("/api/risks")
      .then((r) => r.json())
      .then((d) => {
        const open = ((d.risks ?? []) as Risk[]).filter((r) => r.status !== "RESOLVED");
        setItems(open.sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity)));
      })
      .catch(() => setItems([]));
  }, []);

  if (items === null) return <p className="text-xs text-muted">Loading...</p>;
  if (items.length === 0) return <p className="text-xs text-muted">No open risks.</p>;

  const counts = ORDER.map((s) => ({ s, n: items.filter((r) => r.severity === s).length }));

  return (
    <div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-panel-2 mb-1.5">
        {counts.map(({ s, n }) =>
          n > 0 ? <div key={s} className={COLOR[s]} style={{ width: `${(n / items.length) * 100}%` }} /> : null
        )}
      </div>
      <p className="text-xs text-muted mb-4">
        {counts.filter((c) => c.n > 0).map((c) => `${c.n} ${c.s.toLowerCase()}`).join(" · ")}
      </p>
      <div className="space-y-2">
        {items.slice(0, 4).map((r) => (
          <div key={r.id} className="flex items-center gap-2 text-sm">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", COLOR[r.severity])} />
            <span className="truncate">{r.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}