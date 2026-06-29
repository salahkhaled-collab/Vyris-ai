"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { navigation, settingsItem, NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/user-context";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const { workspaceType } = useUser();

  const allItems: NavItem[] = useMemo(
    () =>
      [...navigation.flatMap((g) => g.items), settingsItem].filter(
        (item) => item.href !== "/team" || workspaceType === "TEAM"
      ),
    [workspaceType]
  );

  const results = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, allItems]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(item: NavItem) {
    router.push(item.href);
    setOpen(false);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) go(results[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-panel border border-line rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line">
          <Search className="w-4 h-4 text-muted" strokeWidth={1.75} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to a page..."
            className="flex-1 bg-transparent text-sm placeholder:text-muted focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-muted px-1.5 py-0.5 rounded border border-line">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto scroll-thin p-2">
          {results.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted text-center">No matches</div>
          )}
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => go(item)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-colors",
                  i === activeIndex
                    ? "bg-brass-soft text-brass"
                    : "text-ink-text hover:bg-white/[0.03]"
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
