"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { automationRules, initialChatMessages } from "@/lib/mock-data";
import { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { Send, Zap, Pause } from "lucide-react";

export default function AutomationPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!input.trim() || pending) return;

    const userMsg: ChatMessage = {
      id: `c${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Vela couldn't respond right now.");
        return;
      }

      const reply: ChatMessage = {
        id: `c${Date.now() + 1}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, reply]);
    } catch {
      setError("Could not reach Vela. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const activeCount = automationRules.filter((r) => r.status === "active").length;

  return (
    <>
      <Topbar
        eyebrow="Intelligence"
        title="AI & Automation"
        statusText={`${activeCount} rules active`}
      />

      <main className="flex-1 overflow-hidden px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <Panel className="lg:col-span-2 flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-line flex items-center justify-between">
            <h3 className="font-display text-xl">Ask Vela</h3>
            <span className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_0_4px_rgba(127,224,200,0.12)]" />
          </div>

          <div className="flex-1 overflow-y-auto scroll-thin px-6 py-6 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-brass-soft text-ink-text"
                      : "bg-panel-2 text-ink-text/90"
                  )}
                >
                  <p>{m.content}</p>
                  <div className="text-[10px] text-muted mt-2 font-mono">{m.timestamp}</div>
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm bg-panel-2 text-muted">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="text-xs text-signal/80 px-1">{error}</div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-line flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask Vela anything — delegate a task, request a summary..."
              disabled={pending}
              className="flex-1 bg-panel-2 border border-line rounded-lg px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={pending}
              className="p-2.5 rounded-lg bg-brass text-[#1a140a] disabled:opacity-60"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </Panel>

        {/* Automation rules */}
        <Panel className="flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-line flex items-center justify-between">
            <h3 className="font-display text-xl">Automation Rules</h3>
            <span className="text-xs font-mono text-muted">{automationRules.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-line">
            {automationRules.map((rule) => (
              <div key={rule.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-sm font-medium leading-snug">{rule.name}</div>
                  <span
                    className={cn(
                      "shrink-0 flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] px-2 py-1 rounded-full",
                      rule.status === "active"
                        ? "bg-signal/[0.12] text-signal"
                        : "bg-panel-2 text-muted"
                    )}
                  >
                    {rule.status === "active" ? (
                      <Zap className="w-3 h-3" strokeWidth={2} />
                    ) : (
                      <Pause className="w-3 h-3" strokeWidth={2} />
                    )}
                    {rule.status}
                  </span>
                </div>
                <div className="text-xs text-muted leading-relaxed space-y-1">
                  <div>
                    <span className="text-ink-text/60">Trigger: </span>
                    {rule.trigger}
                  </div>
                  <div>
                    <span className="text-ink-text/60">Action: </span>
                    {rule.action}
                  </div>
                </div>
                {rule.status === "active" && rule.runsToday > 0 && (
                  <div className="text-[11px] font-mono text-brass mt-2">
                    Ran {rule.runsToday}× today
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-line">
            <button className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-panel-2">
              + New automation rule
            </button>
          </div>
        </Panel>
      </main>
    </>
  );
}
