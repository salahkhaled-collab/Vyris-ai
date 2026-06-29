"use client";

import { useState, useRef } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import {
  Plus, Sparkles, FileText, Link2, Image, File,
  GripVertical, ChevronDown, ChevronUp, Trash2,
  ExternalLink, Loader2, Check, X, Pencil, LayoutGrid,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type ContentType = "text" | "link" | "image" | "file";

interface BrandItem {
  id: string;
  type: ContentType;
  raw: string;           // original paste / url / filename
  title: string;         // AI-assigned or user-edited
  summary: string;       // AI-assigned or user-edited
  section: string;       // which section it belongs to
  createdAt: string;
}

interface BrandSection {
  id: string;
  label: string;
  description: string;
  itemIds: string[];
}

// ── Mock data (replace with DB + API calls) ────────────────────────────────

const MOCK_SECTIONS: BrandSection[] = [
  {
    id: "sec-thinking",
    label: "Thinking",
    description: "Essays, threads, and long-form ideas",
    itemIds: ["i1", "i2"],
  },
  {
    id: "sec-building",
    label: "Building",
    description: "Products, launches, and work in progress",
    itemIds: ["i3", "i4"],
  },
  {
    id: "sec-talking",
    label: "Talking",
    description: "Interviews, podcasts, and public appearances",
    itemIds: ["i5"],
  },
];

const MOCK_ITEMS: BrandItem[] = [
  {
    id: "i1",
    type: "text",
    raw: "Most founders optimize for speed when they should be optimizing for reversibility...",
    title: "On reversible decisions",
    summary: "A thread arguing that decision speed is overrated — reversibility is the real leverage.",
    section: "sec-thinking",
    createdAt: "Jun 10",
  },
  {
    id: "i2",
    type: "link",
    raw: "https://substack.com/your-essay",
    title: "Why AI chiefs of staff will replace EA roles by 2026",
    summary: "Published essay on the structural shift from human EA to AI-native chief of staff.",
    section: "sec-thinking",
    createdAt: "May 28",
  },
  {
    id: "i3",
    type: "link",
    raw: "https://vela.so",
    title: "Vela — AI Chief of Staff",
    summary: "The product itself. Solo founders and executives use it to run their week.",
    section: "sec-building",
    createdAt: "Jun 1",
  },
  {
    id: "i4",
    type: "file",
    raw: "vela-pitch-deck-v3.pdf",
    title: "Vela Pitch Deck v3",
    summary: "12-slide deck covering problem, solution, market, and early traction.",
    section: "sec-building",
    createdAt: "Jun 5",
  },
  {
    id: "i5",
    type: "link",
    raw: "https://youtube.com/watch?v=abc123",
    title: "The Indie Founders Podcast · Ep. 84",
    summary: "45-min conversation on building AI products without a team, and the Vela origin story.",
    section: "sec-talking",
    createdAt: "May 15",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const typeConfig: Record<ContentType, { icon: typeof FileText; label: string; color: string }> = {
  text: { icon: FileText, label: "Text", color: "text-brass" },
  link: { icon: Link2, label: "Link", color: "text-signal" },
  image: { icon: Image, label: "Image", color: "text-purple-400" },
  file: { icon: File, label: "File", color: "text-muted" },
};

function detectType(input: string): ContentType {
  if (input.startsWith("http://") || input.startsWith("https://")) return "link";
  if (/\.(pdf|pptx|docx|xlsx|key)$/i.test(input)) return "file";
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(input)) return "image";
  return "text";
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ItemCard({
  item,
  onDelete,
  onEdit,
}: {
  item: BrandItem;
  onDelete: (id: string) => void;
  onEdit: (id: string, field: "title" | "summary", value: string) => void;
}) {
  const cfg = typeConfig[item.type];
  const Icon = cfg.icon;
  const [editingTitle, setEditingTitle] = useState(false);
  const [draft, setDraft] = useState(item.title);

  return (
    <div className="group flex items-start gap-3 p-4 rounded-xl bg-panel-2 hover:bg-white/[0.03] transition-colors">
      <GripVertical className="w-4 h-4 text-muted/30 mt-0.5 shrink-0 cursor-grab" />
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cfg.color)} strokeWidth={1.5} />
      <div className="flex-1 min-w-0 space-y-1">
        {editingTitle ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { onEdit(item.id, "title", draft); setEditingTitle(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { onEdit(item.id, "title", draft); setEditingTitle(false); } }}
            className="w-full bg-transparent text-sm font-medium text-ink-text border-b border-brass/40 outline-none pb-0.5"
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-ink-text truncate">{item.title}</p>
            <button onClick={() => setEditingTitle(true)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-3 h-3 text-muted" />
            </button>
          </div>
        )}
        <p className="text-xs text-muted leading-relaxed line-clamp-2">{item.summary}</p>
        <div className="flex items-center gap-3 pt-0.5">
          <span className="text-[11px] font-mono text-muted">{item.createdAt}</span>
          {item.type === "link" && (
            <a href={item.raw} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-brass hover:underline">
              Open <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0">
        <Trash2 className="w-3.5 h-3.5 text-muted hover:text-red-400 transition-colors" />
      </button>
    </div>
  );
}

function SectionBlock({
  section,
  items,
  onDelete,
  onEdit,
  onDeleteSection,
}: {
  section: BrandSection;
  items: BrandItem[];
  onDelete: (id: string) => void;
  onEdit: (id: string, field: "title" | "summary", value: string) => void;
  onDeleteSection: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Panel className="overflow-hidden">
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-line cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-display text-xl">{section.label}</h3>
          <span className="font-mono text-xs text-muted">{items.length} items</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }}
            className="text-muted hover:text-red-400 transition-colors p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-muted" />
            : <ChevronUp className="w-4 h-4 text-muted" />}
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-muted text-center py-6">No items in this section yet.</p>
          ) : (
            items.map((item) => (
              <ItemCard key={item.id} item={item} onDelete={onDelete} onEdit={onEdit} />
            ))
          )}
        </div>
      )}
    </Panel>
  );
}

// ── Dump box ───────────────────────────────────────────────────────────────

function DumpBox({ onProcess }: { onProcess: (raw: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    if (!value.trim()) return;
    setLoading(true);
    await onProcess(value.trim());
    setValue("");
    setLoading(false);
  }

  return (
    <Panel className="p-6">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-3">Drop anything here</div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste a tweet, article link, YouTube URL, idea, or anything you've made. Vela will read it, title it, summarize it, and suggest where it belongs."
        rows={4}
        className="w-full bg-panel-2 rounded-xl px-4 py-3 text-sm text-ink-text placeholder:text-muted/50 resize-none outline-none border border-line focus:border-brass/40 transition-colors"
      />
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-muted">Supports text, links, filenames, or raw ideas</p>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || loading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            value.trim() && !loading
              ? "bg-brass text-[#0B0F14] hover:opacity-90"
              : "bg-panel-2 text-muted cursor-not-allowed"
          )}
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Organizing…</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Let Vela organize this</>
          )}
        </button>
      </div>
    </Panel>
  );
}

// ── AI suggestion banner ───────────────────────────────────────────────────

function SuggestionBanner({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: { item: BrandItem; suggestedSection: string; newSection?: string } | null;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  if (!suggestion) return null;

  return (
    <div className="flex items-start gap-4 px-5 py-4 rounded-xl bg-panel-2 border border-brass/20 animate-in fade-in slide-in-from-top-2 duration-300">
      <Sparkles className="w-4 h-4 text-brass mt-0.5 shrink-0" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-text">
          Vela read your content and suggests placing it under{" "}
          <span className="text-brass">"{suggestion.suggestedSection}"</span>
        </p>
        <p className="text-xs text-muted mt-1">
          <span className="text-ink-text/70">{suggestion.item.title}</span>
          {" · "}
          {suggestion.item.summary}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onAccept}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-brass text-[#0B0F14] font-medium"
        >
          <Check className="w-3 h-3" /> Accept
        </button>
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-panel text-muted border border-line"
        >
          <X className="w-3 h-3" /> Change section
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function BrandPage() {
  const [items, setItems] = useState<BrandItem[]>(MOCK_ITEMS);
  const [sections, setSections] = useState<BrandSection[]>(MOCK_SECTIONS);
  const [suggestion, setSuggestion] = useState<{
    item: BrandItem;
    suggestedSection: string;
    targetSectionId: string;
  } | null>(null);

  // ── Fake AI call (replace with real Anthropic API route) ──
  async function processRawInput(raw: string) {
    // Simulated latency
    await new Promise((r) => setTimeout(r, 1400));

    const type = detectType(raw);
    const isLink = type === "link";

    // In production: POST /api/brand/organize { raw } → { title, summary, sectionId }
    const newItem: BrandItem = {
      id: `i${Date.now()}`,
      type,
      raw,
      title: isLink ? "New link · Vela is reading this…" : raw.slice(0, 60) + (raw.length > 60 ? "…" : ""),
      summary: "Vela analyzed this and categorized it. Edit the title or summary to adjust.",
      section: "",
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };

    // Suggest the first section as a demo (real version uses Claude API)
    const guessedSection = sections[Math.floor(Math.random() * sections.length)];

    setSuggestion({
      item: newItem,
      suggestedSection: guessedSection.label,
      targetSectionId: guessedSection.id,
    });
  }

  function acceptSuggestion() {
    if (!suggestion) return;
    const item = { ...suggestion.item, section: suggestion.targetSectionId };
    setItems((prev) => [...prev, item]);
    setSections((prev) =>
      prev.map((s) =>
        s.id === suggestion.targetSectionId
          ? { ...s, itemIds: [...s.itemIds, item.id] }
          : s
      )
    );
    setSuggestion(null);
  }

  function dismissSuggestion() {
    // In real version: open a section picker modal
    setSuggestion(null);
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSections((prev) =>
      prev.map((s) => ({ ...s, itemIds: s.itemIds.filter((iid) => iid !== id) }))
    );
  }

  function editItem(id: string, field: "title" | "summary", value: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  function deleteSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function addSection() {
    const label = `Section ${sections.length + 1}`;
    setSections((prev) => [
      ...prev,
      { id: `sec-${Date.now()}`, label, description: "", itemIds: [] },
    ]);
  }

  const totalItems = items.length;
  const unsectioned = items.filter((i) => !i.section);

  return (
    <>
      <Topbar
        eyebrow="Identity"
        title="Personal Brand"
        statusText={`${totalItems} pieces of content · ${sections.length} sections`}
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-8">

        {/* ── Dump box ── */}
        <DumpBox onProcess={processRawInput} />

        {/* ── AI suggestion banner ── */}
        <SuggestionBanner
          suggestion={suggestion}
          onAccept={acceptSuggestion}
          onDismiss={dismissSuggestion}
        />

        {/* ── Stats bar ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(["text", "link", "image", "file"] as ContentType[]).map((t) => {
            const cfg = typeConfig[t];
            const Icon = cfg.icon;
            const count = items.filter((i) => i.type === t).length;
            return (
              <Panel key={t} className="flex items-center gap-3 px-5 py-4">
                <Icon className={cn("w-4 h-4 shrink-0", cfg.color)} strokeWidth={1.5} />
                <div>
                  <div className="font-mono text-lg leading-none">{count}</div>
                  <div className="text-[11px] text-muted mt-0.5">{cfg.label}s</div>
                </div>
              </Panel>
            );
          })}
        </div>

        {/* ── Sections ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Your Content</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={addSection}
                className="flex items-center gap-1.5 text-xs text-brass font-medium border border-brass/20 px-3 py-1.5 rounded-lg hover:bg-brass-soft transition-colors"
              >
                <Plus className="w-3 h-3" /> Add section
              </button>
              <button className="flex items-center gap-1.5 text-xs text-muted border border-line px-3 py-1.5 rounded-lg hover:bg-panel-2 transition-colors">
                <LayoutGrid className="w-3 h-3" /> Reorder
              </button>
            </div>
          </div>

          {sections.map((section) => {
            const sectionItems = items.filter((i) => section.itemIds.includes(i.id));
            return (
              <SectionBlock
                key={section.id}
                section={section}
                items={sectionItems}
                onDelete={deleteItem}
                onEdit={editItem}
                onDeleteSection={deleteSection}
              />
            );
          })}

          {/* Unsectioned items */}
          {unsectioned.length > 0 && (
            <Panel className="overflow-hidden border border-dashed border-line">
              <div className="px-6 py-4 border-b border-line">
                <h3 className="font-display text-lg text-muted">Unsorted</h3>
              </div>
              <div className="p-4 space-y-2">
                {unsectioned.map((item) => (
                  <ItemCard key={item.id} item={item} onDelete={deleteItem} onEdit={editItem} />
                ))}
              </div>
            </Panel>
          )}
        </section>

      </main>
    </>
  );
}