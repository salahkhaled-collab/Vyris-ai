"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { useUser } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import {
  GripVertical, Target, GitBranch, AlertTriangle, TrendingUp, FolderKanban, Plus, X, Activity,
} from "lucide-react";  
import Link from "next/link";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { parseLayout, serializeLayout, DEFAULT_ORDER } from "@/lib/dashboard-layout";

const WIDGET_META: Record<string, { label: string; icon: typeof Target; href: string }> = {
  objectives: { label: "Objectives", icon: Target, href: "/strategy" },
  decisions:  { label: "Open Decisions", icon: GitBranch, href: "/decisions" },
  risks:      { label: "Risks", icon: AlertTriangle, href: "/risks" },
  bets:       { label: "Strategic Bets", icon: TrendingUp, href: "/strategy" },
  projects:   { label: "Projects", icon: FolderKanban, href: "/projects" },
    progress:   { label: "Progress", icon: Activity, href: "/projects" },
};

function computeProgress(keyResults: { current: number; target: number }[]) {
  if (keyResults.length === 0) return 0;
  const pct = keyResults.reduce((sum, kr) => sum + Math.min(kr.current / (kr.target || 1), 1), 0) / keyResults.length;
  return Math.round(pct * 100);
}

// ── Individual widget bodies - each fetches its own real data ─────────────

function ObjectivesWidget() {
  const [items, setItems] = useState<{ id: string; title: string; keyResults: { current: number; target: number }[] }[] | null>(null);
  useEffect(() => { fetch("/api/objectives").then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d.slice(0, 4) : [])).catch(() =>setItems([])); }, []);
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
  const [items, setItems] = useState<{ id: string; title?: string; name?: string; status: string }[] | null>(null);
  useEffect(() => { fetch("/api/projects").then((r) => r.json()).then((d) => setItems((d.projects ?? []).slice(0, 4))).catch(() => setItems([])); }, []);
  if (items === null) return <p className="text-xs text-muted">Loading...</p>;
  if (items.length === 0) return <p className="text-xs text-muted">No projects yet.</p>;
  return (
    <div className="space-y-2">
      {items.map((p) => (
        <div key={p.id} className="flex items-center justify-between text-sm">
          <span className="truncate">{p.title ?? p.name}</span>
          <span className="text-muted text-xs shrink-0 ml-2 capitalize">{p.status.toLowerCase()}</span>
        </div>
      ))}
    </div>
  );
}

type ProgressData = {
  counts: { TODO: number; IN_PROGRESS: number; DONE: number };
  weeks: { start: string; done: number }[];
};

function ProgressWidget() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/progress")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="text-xs text-muted">Couldn't load progress.</p>;
  if (!data) return <p className="text-xs text-muted">Loading...</p>;

  const { counts, weeks } = data;
  const total = counts.TODO + counts.IN_PROGRESS + counts.DONE;
  if (total === 0) return <p className="text-xs text-muted">No tasks yet.</p>;

  const pct = Math.round((counts.DONE / total) * 100);
  const max = Math.max(1, ...weeks.map((w) => w.done));
  const seg = (n: number) => `${(n / total) * 100}%`;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl">{pct}%</span>
        <span className="text-xs text-muted">{counts.DONE} of {total} tasks done</span>
      </div>

      <div>
        <div className="flex h-2 rounded-full overflow-hidden bg-panel-2">
          <div className="bg-brass" style={{ width: seg(counts.DONE) }} />
          <div className="bg-brass" style={{ width: seg(counts.IN_PROGRESS), opacity: 0.45 }} />
        </div>
        <div className="flex justify-between text-xs text-muted mt-1.5">
          <span>{counts.DONE} done</span>
          <span>{counts.IN_PROGRESS} in progress</span>
          <span>{counts.TODO} to do</span>
        </div>
      </div>

      <div>
        <div className="flex items-end gap-1 h-16">
          {weeks.map((w) => (
            <div
              key={w.start}
              title={`Week of ${w.start}: ${w.done} done`}
              className="flex-1 bg-brass rounded-sm"
              style={{ height: `${Math.max((w.done / max) * 100, w.done > 0 ? 8 : 3)}%`, opacity: w.done > 0 ? 1 : 0.25 }}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted mt-1.5">
          <span>8 weeks ago</span>
          <span>this week</span>
        </div>
      </div>
    </div>
  );
}

const WIDGET_BODY: Record<string, () => JSX.Element> = {
  objectives: ObjectivesWidget,
  decisions: DecisionsWidget,
  risks: RisksWidget,
  bets: BetsWidget,
  projects: ProjectsWidget,
    progress: ProgressWidget,
};

// ── Sortable card ────────────────────────────────────────────────────────

function SortableWidget({
  id, editing, onHide,
}: { id: string; editing: boolean; onHide: (id: string) => void }) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging,
  } = useSortable({ id, disabled: !editing });

  const meta = WIDGET_META[id];
  const Body = WIDGET_BODY[id];
  if (!meta || !Body) return null;
  const Icon = meta.icon;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Panel className={cn("p-5", editing && "ring-1 ring-brass")}>
        <div className="flex items-center justify-between mb-4">
          <Link href={meta.href} className="flex items-center gap-2 hover:text-brass transition-colors">
            <Icon className="w-4 h-4 text-brass" strokeWidth={1.75} />
            <h3 className="font-display text-lg">{meta.label}</h3>
          </Link>
          {editing && (
            <div className="flex items-center gap-1">
              <button
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none p-1 text-muted hover:text-ink-text"
                aria-label="Drag to reorder"
              >
                <GripVertical className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                onClick={() => onHide(id)}
                className="p-1 text-muted hover:text-ink-text"
                aria-label={`Hide ${meta.label}`}
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
        <Body />
      </Panel>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { dashboardLayout, setDashboardLayout, loading } = useUser();
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER);
  const [hidden, setHidden] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seq = useRef(0);
  const dirty = useRef(false);

  useEffect(() => {
    if (loading || dirty.current) return; // a stale server response must not overwrite newer local edits
    const p = parseLayout(dashboardLayout);
    setOrder(p.order);
    setHidden(p.hidden);
  }, [dashboardLayout, loading]);

  const save = useCallback(
    (o: string[], h: string[]) => {
      const mine = ++seq.current;
      dirty.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        setStatus("saving");
        try {
          await setDashboardLayout(serializeLayout(o, h));
          setStatus("idle");
        } catch {
          setStatus("error");
        } finally {
          if (mine === seq.current) dirty.current = false;
        }
      }, 500);
    },
    [setDashboardLayout]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next);
    save(next, hidden);
  }

  function hide(id: string) {
    const o = order.filter((x) => x !== id);
    const h = [...hidden, id];
    setOrder(o);
    setHidden(h);
    save(o, h);
  }

  function show(id: string) {
    const h = hidden.filter((x) => x !== id);
    const o = [...order, id];
    setOrder(o);
    setHidden(h);
    save(o, h);
  }

  function reset() {
    setOrder([...DEFAULT_ORDER]);
    setHidden([]);
    save([...DEFAULT_ORDER], []);
  }

  return (
    <>
      <Topbar
        eyebrow="Overview"
        title="Dashboard"
        statusText={
          status === "saving" ? "Saving layout..." : status === "error" ? "Couldn't save layout" : undefined
        }
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted">
            {editing ? "Drag the handle to reorder. Use × to hide a card." : ""}
          </p>
          <div className="flex items-center gap-2">
            {editing && (
              <button onClick={reset} className="text-xs text-muted hover:text-ink-text px-2 py-1">
                Reset
              </button>
            )}
            <button
              onClick={() => setEditing((e) => !e)}
              className="text-xs px-3 py-1.5 rounded-md bg-panel-2 hover:text-brass transition-colors"
            >
              {editing ? "Done" : "Customize"}
            </button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.map((id) => (
                <SortableWidget key={id} id={id} editing={editing} onHide={hide} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {order.length === 0 && (
          <p className="text-sm text-muted">Every card is hidden. Click Customize to add some back.</p>
        )}

        {editing && hidden.length > 0 && (
          <section className="mt-8">
            <h4 className="text-xs text-muted mb-3">Hidden</h4>
            <div className="flex flex-wrap gap-2">
              {hidden.map((id) => (
                <button
                  key={id}
                  onClick={() => show(id)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md bg-panel-2 hover:text-brass transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {WIDGET_META[id]?.label ?? id}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}