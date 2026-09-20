"use client";

import { useEffect, useState } from "react";

type ProgressData = {
  counts: { TODO: number; IN_PROGRESS: number; DONE: number };
  weeks: { start: string; done: number }[];
};

function ProgressChart() {
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return null;
  const { counts, weeks } = data;
  const total = counts.TODO + counts.IN_PROGRESS + counts.DONE;
  if (total === 0) return null;

  const pct = Math.round((counts.DONE / total) * 100);
  const max = Math.max(1, ...weeks.map((w) => w.done));
  const seg = (n: number) => `${(n / total) * 100}%`;

  return (
    <div className="mb-4 pb-4 border-b border-panel-2">
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="font-display text-2xl">{pct}%</span>
          <p className="text-xs text-muted">{counts.DONE} of {total} tasks done</p>
        </div>
        <div className="flex items-end gap-1 h-10 flex-1 max-w-[140px]">
          {weeks.map((w) => (
            <div
              key={w.start}
              title={`Week of ${w.start}: ${w.done} done`}
              className="flex-1 bg-brass rounded-sm"
              style={{
                height: `${Math.max((w.done / max) * 100, w.done > 0 ? 8 : 3)}%`,
                opacity: w.done > 0 ? 1 : 0.25,
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-panel-2 mt-3">
        <div className="bg-brass" style={{ width: seg(counts.DONE) }} />
        <div className="bg-brass" style={{ width: seg(counts.IN_PROGRESS), opacity: 0.45 }} />
      </div>
    </div>
  );
}

export function ProjectsCard() {
  const [items, setItems] = useState<{ id: string; title?: string; name?: string; status: string }[] | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setItems((d.projects ?? []).slice(0, 3)))
      .catch(() => setItems([]));
  }, []);

  if (items === null) return <p className="text-xs text-muted">Loading...</p>;

  return (
    <div>
      <ProgressChart />
      {items.length === 0 ? (
        <p className="text-xs text-muted">No projects yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{p.title ?? p.name}</span>
              <span className="text-muted text-xs shrink-0 ml-2 capitalize">{p.status.toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
