"use client";

import { useShowCharts } from "@/lib/use-show-charts";

export function ChartsToggle({ show }: { show: boolean }) {
  const [showCharts, setShowCharts] = useShowCharts();
  if (!show) return null;
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted hover:text-ink-text cursor-pointer select-none">
      <input
        type="checkbox"
        checked={showCharts}
        onChange={(e) => setShowCharts(e.target.checked)}
      />
      Show charts
    </label>
  );
}
