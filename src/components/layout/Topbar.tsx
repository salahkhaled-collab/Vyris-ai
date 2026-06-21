"use client";

import { Search } from "lucide-react";

interface TopbarProps {
  eyebrow: string;
  title: string;
  statusText?: string;
}

export function Topbar({ eyebrow, title, statusText }: TopbarProps) {
  return (
    <header className="flex items-center justify-between px-6 lg:px-10 py-5 border-b border-line">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{eyebrow}</div>
        <h1 className="font-display text-2xl mt-1">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            )
          }
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-panel-2 text-sm text-muted hover:text-ink-text transition-colors"
        >
          <Search className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded border border-line">
            ⌘K
          </kbd>
        </button>
        {statusText && (
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full bg-panel-2 text-sm text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_0_4px_rgba(127,224,200,0.12)]" />
            {statusText}
          </div>
        )}
        <button className="px-4 py-2 rounded-full text-sm font-medium bg-brass text-[#1a140a]">
          Ask Vela
        </button>
      </div>
    </header>
  );
}
