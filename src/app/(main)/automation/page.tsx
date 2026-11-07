"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { Send, Zap, Pause, Plus, Trash2, X, Play } from "lucide-react";
import {
  ACTION_LABELS,
  DEFAULT_TASK_TITLE,
  SCHEDULED_TRIGGERS,
  TRIGGERS,
  TRIGGER_KEYS,
  actionsFor,
  describeRule,
  isTriggerKey,
  parseAction,
  type RuleAction,
  type TriggerKey,
} from "@/lib/automation/rules";
import { DictationButton } from "@/components/ui/DictationButton";

interface AutomationRun {
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  detail: string;
  createdAt: string;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  status: "ACTIVE" | "PAUSED";
  lastRun: AutomationRun | null;
}

interface RuleForm {
  name: string;
  trigger: TriggerKey;
  actionType: RuleAction["type"];
  title: string;
  dueInDays: number;
}

const emptyForm: RuleForm = {
  name: "",
  trigger: "task_blocked",
  actionType: "email_me",
  title: DEFAULT_TASK_TITLE,
  dueInDays: 2,
};

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} hr ago` : `${Math.round(hours / 24)} days ago`;
}

export default function AutomationPage() {
  // ── Chat (real, calls /api/ai/chat) ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
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
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
          page: "automation",
        }),
      });

      const data = await res.json();
      if (data.conversationId) setConversationId(data.conversationId);

      if (!res.ok) {
        setError(data.message ?? "Vyris couldn't respond right now.");
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
      setError("Could not reach Vyris. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  // ── Automation rules (real, backed by /api/automation-rules) ──
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/automation-rules")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setRulesError(data.message ?? "Could not load automation rules.");
          return;
        }
        setRules(data.rules ?? []);
      })
      .catch(() => setRulesError("Could not reach server."))
      .finally(() => setRulesLoading(false));
  }, []);

  async function createRule() {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setRulesError(null);
    const action: RuleAction =
      form.actionType === "create_task"
        ? { type: "create_task", title: form.title, dueInDays: form.dueInDays }
        : { type: "email_me" };
    try {
      const res = await fetch("/api/automation-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, trigger: form.trigger, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Could not create rule.");
      }
      const rule = await res.json();
      setRules((prev) => [rule, ...prev]);
      setForm(emptyForm);
      setCreating(false);
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : "Could not create rule.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: AutomationRule) {
    const nextStatus = rule.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, status: nextStatus } : r)));
    try {
      const res = await fetch(`/api/automation-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? rule : r)));
    }
  }

  async function runNow(rule: AutomationRule) {
    if (runningId) return;
    setRunningId(rule.id);
    setRulesError(null);
    try {
      const res = await fetch(`/api/automation-rules/${rule.id}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't run the rule.");
      const outcome = data.outcome as { status: AutomationRun["status"]; detail: string } | null;
      if (outcome) {
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, lastRun: { ...outcome, createdAt: new Date().toISOString() } } : r))
        );
      }
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : "Couldn't run the rule.");
    } finally {
      setRunningId(null);
    }
  }

  async function deleteRule(id: string) {
    const previous = rules;
    setRules((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/automation-rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setRules(previous);
    }
  }

  const activeCount = rules.filter((r) => r.status === "ACTIVE").length;

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
            <h3 className="font-display text-xl">Ask Vyris</h3>
            <span className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_0_4px_rgba(127,224,200,0.12)]" />
          </div>

          <div className="flex-1 overflow-y-auto scroll-thin px-6 py-6 space-y-4">
            {messages.length === 0 && !pending && (
              <div className="text-sm text-muted py-8 text-center">
                Ask Vyris to delegate a task, summarize something, or think through a decision.
              </div>
            )}
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

          <div className="px-6 py-4 border-t border-line flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask Vyris anything — delegate a task, request a summary..."
              disabled={pending}
              className="flex-1 bg-panel-2 border border-line rounded-lg px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass disabled:opacity-60"
            />
            <DictationButton
              onTranscript={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
            />
            <button
              onClick={handleSend}
              disabled={pending}
              className="p-2.5 rounded-lg bg-brass text-white disabled:opacity-60"
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
            <span className="text-xs font-mono text-muted">{rules.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto scroll-thin divide-y divide-line">
            {rulesLoading && (
              <div className="px-6 py-8 text-sm text-muted text-center">Loading rules...</div>
            )}

            {rulesError && (
              <div className="px-6 py-4 text-xs text-signal/80">{rulesError}</div>
            )}

            {!rulesLoading && rules.length === 0 && !creating && (
              <div className="px-6 py-8 text-sm text-muted text-center">
                No automation rules yet.
              </div>
            )}

            {creating && (
              <div className="px-6 py-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.14em] text-muted">New rule</span>
                  <button onClick={() => { setCreating(false); setForm(emptyForm); }} className="text-muted hover:text-ink-text">
                    <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                </div>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Rule name"
                  className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"
                />
                <label className="block text-[11px] text-muted">When</label>
                <select
                  value={form.trigger}
                  onChange={(e) => {
                    const trigger = e.target.value as TriggerKey;
                    setForm({
                      ...form,
                      trigger,
                      actionType: actionsFor(trigger).includes(form.actionType) ? form.actionType : "email_me",
                    });
                  }}
                  className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brass"
                >
                  {TRIGGER_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {TRIGGERS[k].label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted -mt-1">Runs {TRIGGERS[form.trigger].runs}.</p>
                <label className="block text-[11px] text-muted">Then</label>
                <select
                  value={form.actionType}
                  onChange={(e) => setForm({ ...form, actionType: e.target.value as RuleAction["type"] })}
                  className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brass"
                >
                  {actionsFor(form.trigger).map((a) => (
                    <option key={a} value={a}>
                      {ACTION_LABELS[a]}
                    </option>
                  ))}
                </select>
                {form.actionType === "create_task" && (
                  <div className="space-y-2">
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      maxLength={200}
                      placeholder={DEFAULT_TASK_TITLE}
                      className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"
                    />
                    <p className="text-[11px] text-muted">Use {"{task}"} and {"{project}"} in the title.</p>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      Due in
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={form.dueInDays}
                        onChange={(e) => setForm({ ...form, dueInDays: Number(e.target.value) || 0 })}
                        className="w-16 bg-panel-2 border border-line rounded-lg px-2 py-1 text-sm"
                      />
                      days
                    </label>
                  </div>
                )}
                {form.actionType === "email_me" && (
                  <p className="text-[11px] text-muted">Sent to yourself through your connected Gmail.</p>
                )}
                <button
                  onClick={createRule}
                  disabled={!form.name.trim() || saving}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save rule"}
                </button>
              </div>
            )}

            {rules.map((rule) => (
              <div key={rule.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-sm font-medium leading-snug">{rule.name}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleRule(rule)}
                      className={cn(
                        "flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] px-2 py-1 rounded-full transition-colors",
                        rule.status === "ACTIVE"
                          ? "bg-signal/[0.12] text-signal"
                          : "bg-panel-2 text-muted"
                      )}
                    >
                      {rule.status === "ACTIVE" ? (
                        <Zap className="w-3 h-3" strokeWidth={2} />
                      ) : (
                        <Pause className="w-3 h-3" strokeWidth={2} />
                      )}
                      {rule.status === "ACTIVE" ? "active" : "paused"}
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="text-muted hover:text-signal/80">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
                {(() => {
                  const action = parseAction(rule.action);
                  const runnable = isTriggerKey(rule.trigger) && action !== null;
                  return (
                    <div className="text-xs text-muted leading-relaxed space-y-1.5">
                      {runnable && isTriggerKey(rule.trigger) && action ? (
                        <div>{describeRule(rule.trigger, action)}</div>
                      ) : (
                        <div>
                          <span className="text-red-500">Old text rule, doesn&apos;t run.</span> Delete it and create a new
                          one. ({rule.trigger} → {rule.action})
                        </div>
                      )}
                      {rule.lastRun ? (
                        <div className={cn(rule.lastRun.status === "FAILED" ? "text-red-500" : "text-muted")}>
                          Last run {timeAgo(rule.lastRun.createdAt)}: {rule.lastRun.detail}
                        </div>
                      ) : (
                        runnable && <div>Hasn&apos;t run yet.</div>
                      )}
                      {runnable && isTriggerKey(rule.trigger) && SCHEDULED_TRIGGERS.includes(rule.trigger) && (
                        <button
                          onClick={() => void runNow(rule)}
                          disabled={runningId !== null}
                          className="flex items-center gap-1 text-[11px] text-brass hover:underline disabled:opacity-50"
                        >
                          <Play className="w-3 h-3" strokeWidth={2} />
                          {runningId === rule.id ? "Running..." : "Run now"}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          {!creating && (
            <div className="px-6 py-4 border-t border-line">
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-panel-2 hover:bg-black/[0.06] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                New automation rule
              </button>
            </div>
          )}
        </Panel>
      </main>
    </>
  );
}
