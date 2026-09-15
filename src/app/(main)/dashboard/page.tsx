"use client";

import { useEffect, useState, useCallback } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import {
  GripVertical, Target, GitBranch, AlertTriangle, TrendingUp, FolderKanban,
} from "lucide-react";
import Link from "next/link";

const DEFAULT_ORDER = ["objectives", "decisions", "risks", "bets", "projects"];

const WIDGET_META: Record<string, { label: string; icon: typeof Target; href: string }> = {
  objectives: { label: "Objectives", icon: Target, href: "/strategy" },
  decisions:  { label: "Open Decisions", icon: GitBranch, href: "/decisions" },
  risks:      { label: "Risks", icon: AlertTriangle, href: "/risks" },
  bets:       { label: "Strategic Bets", icon: TrendingUp, href: "/strategy" },
  projects:   { label: "Projects", icon: FolderKanban, href: "/projects" },
};

function computeProgress(keyResults: { current: number; target: number }[]) {
  if (keyResults.length === 0) return 0;
  const pct = keyResults.reduce((sum, kr) => sum + Math.min(kr.current / (kr.target || 1), 1), 0) / keyResults.length;
  return Math.round(pct * 100);
}

// ── Individual widget bodies - each fetches its own real data ─────────────

function ObjectivesWidget() {
  const [items, setItems] = useState<{ id: string; title: string; keyResults: { current: number; target: number }[] }[] | null>(null);
  useEffect(() => { fetch("/api/objectives").then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d.slice(0, 4) : [])).catch(() => setItems([])); }, []);
  if (items === null) return <p className="text-xs text-muted">Loading...</p>;
  if (items.length === 0) return <p className="text-xs text-muted">No objectives yet.</p>;
  return (
    <div className="space-y-3">
      {items.map((o) => (
        <div key={o.id}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="truncate">{o.title}</span>
            <span className="text-muted text-xs shrink-0 ml-2">{computeProgress(o.keyResults)}%</span>
          </div>
          <div className="h-1.5 bg-panel-2 rounded-full overflow-hidden">
            <div className="h-full bg-brass rounded-full" style={{ width: `${computeProgress(o.keyResults)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DecisionsWidget() {
  const [items, setItems] = useState<{ id: string; title: string; deadline: string }[] | null>(null);
  useEffect(() => {
    fetch("/api/decisions").then((r) => r.json()).then((d) =>
      setItems(Array.isArray(d) ? d.filter((x: { status: string }) => x.status === "OPEN").slice(0, 4) : [])
    ).catch(() => setItems([]));
  }, []);
  if (items === null) return <p className="text-xs text-muted">Loading...</p>;
  if (items.length === 0) return <p className="text-xs text-muted">Nothing open right now.</p>;
  return (
    <div className="space-y-2">
      {items.map((d) => (
        <div key={d.id} className="flex items-center justify-between text-sm">
          <span className="truncate">{d.title}</span>
          <span className="text-muted text-xs shrink-0 ml-2">{d.deadline}</span>
        </div>
      ))}
    </div>
  );
}

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-600", HIGH: "bg-red-500", MEDIUM: "bg-brass", LOW: "bg-muted",
};

function RisksWidget() {
  const [items, setItems] = useState<{ id: string; title: string; severity: keyof typeof SEVERITY_ORDER; status: string }[] | null>(null);
  useEffect(() => {
    fetch("/api/risks").then((r) => r.json()).then((d) =>
      setItems((d.risks ?? []).filter((r: { status: string }) => r.status !== "RESOLVED")
        .sort((a: { severity: keyof typeof SEVERITY_ORDER }, b: { severity: keyof typeof SEVERITY_ORDER }) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
        .slice(0, 4))
    ).catch(() => setItems([]));
  }, []);
  if (items === null) return <p className="text-xs text-muted">Loading...</p>;
  if (items.length === 0) return <p className="text-xs text-muted">No open risks.</p>;
  return (
    <div className="space-y-2">
      {items.map((r) => (
        <div key={r.id} className="flex items-center gap-2 text-sm">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SEVERITY_COLOR[r.severity])} />
          <span className="truncate">{r.title}</span>
        </div>
      ))}
    </div>
  );
}

const BET_COLOR: Record<string, string> = { ON_TRACK: "text-signal", AT_RISK: "text-brass", OFF_TRACK: "text-red-500" };

function BetsWidget() {
  const [items, setItems] = useState<{ id: string; title: string; status: string }[] | null>(null);
  useEffect(() => { fetch("/api/strategic-bets").then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d.slice(0, 4) : [])).catch(() => setItems([])); }, []);
  if (items === null) return <p className="text-xs text-muted">Loading...</p>;
  if (items.length === 0) return <p className="text-xs text-muted">No strategic bets yet.</p>;
  return (
    <div className="space-y-2">
      {items.map((b) => (
        <div key={b.id} className="flex items-center justify-between text-sm">
          <span className="truncate">{b.title}</span>
          <span className={cn("text-xs shrink-0 ml-2", BET_COLOR[b.status] ?? "text-muted")}>
            {b.status.replace("_", " ").toLowerCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProjectsWidget() {
  const [items, setItems] = useState<{ id: string; name: string; status: string }[] | null>(null);
  useEffect(() => { fetch("/api/projects").then((r) => r.json()).then((d) => setItems((d.projects ?? []).slice(0, 4))).catch(() => setItems([])); }, []);
  if (items === null) return <p className="text-xs text-muted">Loading...</p>;
  if (items.length === 0) return <p className="text-xs text-muted">No projects yet.</p>;
  return (
    <div className="space-y-2">
      {items.map((p) => (
        <div key={p.id} className="flex items-center justify-between text-sm">
          <span className="truncate">{p.name}</span>
          <span className="text-muted text-xs shrink-0 ml-2 capitalize">{p.status.toLowerCase()}</span>
        </div>
      ))}
    </div>
  );
}

const WIDGET_BODY: Record<string, () => JSX.Element> = {
  objectives: ObjectivesWidget,
  decisions: DecisionsWidget,
  risks: RisksWidget,
  bets: BetsWidget,
  projects: ProjectsWidget,
};

// ── Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { dashboardLayout, setDashboardLayout, loading } = useUser();
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (dashboardLayout.length === 0) {
      setOrder(DEFAULT_ORDER);
    } else {
      const missing = DEFAULT_ORDER.filter((w) => !dashboardLayout.includes(w));
      setOrder([...dashboardLayout, ...missing]);
    }
  }, [dashboardLayout, loading]);

  const persist = useCallback(async (next: string[]) => {
    setSaving(true);
    try {
      await setDashboardLayout(next);
    } catch {
      // keep local order even if save failed - not worth blocking the UI
    } finally {
      setSaving(false);
    }
  }, [setDashboardLayout]);

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrder(next);
    setDragIndex(null);
    persist(next);
  }

  return (
    <>
      <Topbar eyebrow="Overview" title="Dashboard" statusText={saving ? "Saving layout..." : undefined} />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8">
        <p className="text-xs text-muted mb-4">Drag any card by its handle to reorder your dashboard.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {order.map((key, index) => {
            const meta = WIDGET_META[key];
            const Body = WIDGET_BODY[key];
            if (!meta || !Body) return null;
            const Icon = meta.icon;
            return (
              <Panel
                key={key}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                className={cn("p-5 cursor-default transition-opacity", dragIndex === index && "opacity-40")}
              >
                <div className="flex items-center justify-between mb-4">
                  <Link href={meta.href} className="flex items-center gap-2 hover:text-brass transition-colors">
                    <Icon className="w-4 h-4 text-brass" strokeWidth={1.75} />
                    <h3 className="font-display text-lg">{meta.label}</h3>
                  </Link>
                  <span className="cursor-grab active:cursor-grabbing text-muted hover:text-ink-text" title="Drag to reorder">
                    <GripVertical className="w-4 h-4" strokeWidth={1.75} />
                  </span>
                </div>
                <Body />
              </Panel>
            );
          })}
        </div>
      </main>
    </>
  );
}
