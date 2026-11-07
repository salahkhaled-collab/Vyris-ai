"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import DOMPurify from "dompurify";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { Mail, Pencil, X, Sparkles, Loader2 } from "lucide-react";
import {
  FILTERS,
  FILTER_LABELS,
  PRIORITIES,
  WAITING_DAYS,
  daysWaiting,
  matchesFilter,
  replyCandidates,
  type InboxFilter,
  type Priority,
  type ThreadSummary,
  type TriageResult,
} from "@/lib/inbox-ai";

interface GmailMessage {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  snippet: string;
  unread: boolean;
  timestamp: string;
}

interface OpenEmailBody {
  html: string | null;
  text: string;
}

type ReplyTarget = { to: string | null; subject: string; threadId: string; inReplyTo: string | null };

interface SummaryResponse extends ThreadSummary {
  reply: ReplyTarget | null;
}

interface QueueItem {
  email: GmailMessage;
  summary: SummaryResponse | null;
  draft: string;
  state: "drafting" | "ready" | "sending" | "sent" | "skipped" | "error";
  message: string | null;
}

class ApiError extends Error {
  constructor(message: string, public status: number, public retryAfter: number | null) {
    super(message);
  }
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const d = data as { message?: string; retryAfter?: number };
    const msg = res.status === 403 ? "Reconnect Gmail to enable sending." : d.message ?? "Something went wrong.";
    throw new ApiError(msg, res.status, typeof d.retryAfter === "number" ? d.retryAfter : null);
  }
  return data as T;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Triage results are remembered per email on this device, so reloading the
// Inbox doesn't spend the AI provider's per-minute budget re-sorting old mail.
const TRIAGE_CACHE_KEY = "vyris.inbox.triage.v1";
const TRIAGE_CACHE_MAX = 300;
type TriageCache = { results: Record<string, TriageResult>; projects: Record<string, string> };

function readTriageCache(): TriageCache {
  try {
    const raw = window.localStorage.getItem(TRIAGE_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<TriageCache>) : null;
    return { results: parsed?.results ?? {}, projects: parsed?.projects ?? {} };
  } catch {
    return { results: {}, projects: {} };
  }
}

function writeTriageCache(cache: TriageCache) {
  try {
    const ids = Object.keys(cache.results).slice(-TRIAGE_CACHE_MAX);
    const results = Object.fromEntries(ids.map((id) => [id, cache.results[id]]));
    window.localStorage.setItem(TRIAGE_CACHE_KEY, JSON.stringify({ results, projects: cache.projects }));
  } catch {
    // Storage unavailable (private mode etc.): fine, we just re-sort next time.
  }
}

const priorityStyle: Record<Priority, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-red-500/10 text-red-600" },
  needs_reply: { label: "Needs reply", className: "bg-brass-soft text-brass" },
  fyi: { label: "FYI", className: "bg-panel-2 text-muted" },
  low: { label: "Low", className: "bg-panel-2 text-muted/70" },
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

export default function InboxPage() {
  const { status } = useSession();

  const [emails, setEmails] = useState<GmailMessage[] | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSuccess, setComposeSuccess] = useState(false);

  const [openEmailId, setOpenEmailId] = useState<string | null>(null);
  const [openEmailBody, setOpenEmailBody] = useState<OpenEmailBody | null>(null);
  const [openEmailLoading, setOpenEmailLoading] = useState(false);
  const [openEmailError, setOpenEmailError] = useState<string | null>(null);

  const [triage, setTriage] = useState<Record<string, TriageResult> | null>(null);
  const [triageProjects, setTriageProjects] = useState<Record<string, string>>({});
  const [triaging, setTriaging] = useState(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyStatus, setReplyStatus] = useState<string | null>(null);

  const [filter, setFilter] = useState<InboxFilter>("all");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [drafting, setDrafting] = useState(false);
  const autoTriaged = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    setEmailLoading(true);
    fetch("/api/gmail")
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setEmailError(data.message ?? "Could not load your inbox.");
          setEmails(null);
        } else {
          setEmails(data.messages);
          setEmailError(null);
        }
      })
      .catch(() => active && setEmailError("Could not reach Gmail."))
      .finally(() => active && setEmailLoading(false));
    return () => {
      active = false;
    };
  }, [status]);

  const unreadEmailCount = emails?.filter((e) => e.unread).length ?? 0;

  // With triage results, show urgent first, then needs reply, FYI, low; newest first within each.
  const orderedEmails = useMemo(() => {
    if (!emails) return null;
    if (!triage) return emails;
    const rank = (id: string) => PRIORITIES.indexOf(triage[id]?.priority ?? "fyi");
    return [...emails].sort(
      (a, b) => rank(a.id) - rank(b.id) || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [emails, triage]);

  const visibleEmails = useMemo(
    () => (orderedEmails ?? []).filter((e) => matchesFilter(triage?.[e.id], filter)),
    [orderedEmails, triage, filter]
  );
  const counts = useMemo(() => {
    const c = {} as Record<InboxFilter, number>;
    for (const f of FILTERS) c[f] = (emails ?? []).filter((e) => matchesFilter(triage?.[e.id], f)).length;
    return c;
  }, [emails, triage]);
  const candidates = useMemo(() => (emails && triage ? replyCandidates(emails, triage) : []), [emails, triage]);

  // Sort the inbox once it loads: reuse remembered results, ask the AI only about new emails.
  useEffect(() => {
    if (autoTriaged.current || !emails || emails.length === 0) return;
    autoTriaged.current = true;
    const cache = readTriageCache();
    const cached = Object.fromEntries(emails.filter((e) => cache.results[e.id]).map((e) => [e.id, cache.results[e.id]]));
    if (Object.keys(cached).length > 0) {
      setTriage(cached);
      setTriageProjects(cache.projects);
    }
    if (emails.some((e) => !cache.results[e.id])) void prioritize(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails]);

  /** Once answered (by sending, or Vyris sees you already replied), move it out of Needs reply. */
  function markAnswered(id: string) {
    setTriage((prev) => {
      const current = prev?.[id];
      if (!prev || !current || (current.priority !== "urgent" && current.priority !== "needs_reply")) return prev;
      const updated: TriageResult = { ...current, priority: "fyi", reason: "Answered" };
      const cache = readTriageCache();
      writeTriageCache({ results: { ...cache.results, [id]: updated }, projects: cache.projects });
      return { ...prev, [id]: updated };
    });
  }

  function updateQueue(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((q) => (q.email.id === id ? { ...q, ...patch } : q)));
  }

  /** The reply agent: draft a reply for every work email waiting on you. Sends nothing. */
  async function draftReplies() {
    if (drafting || candidates.length === 0) return;
    setDrafting(true);
    setQueue(candidates.map((email) => ({ email, summary: null, draft: "", state: "drafting", message: null })));
    for (const email of candidates) {
      try {
        let data: SummaryResponse | null = null;
        // On the provider's per-minute limit, wait as long as it asks (up to twice), then carry on.
        for (let attempt = 0; attempt < 3 && !data; attempt++) {
          try {
            data = await postJson<SummaryResponse>("/api/ai/inbox/summarize", { messageId: email.id });
          } catch (err) {
            if (!(err instanceof ApiError) || err.status !== 429 || attempt === 2) throw err;
            const wait = err.retryAfter ?? 20;
            updateQueue(email.id, { message: `Waiting ${wait}s for the AI usage limit...` });
            await sleep(wait * 1000);
            updateQueue(email.id, { message: null });
          }
        }
        if (!data) throw new Error("Couldn't draft.");
        const hasDraft = Boolean(data.replyDraft?.trim());
        if (data.reply?.to && !data.needsReply && !hasDraft) markAnswered(email.id);
        updateQueue(email.id, {
          summary: data,
          draft: data.replyDraft ?? "",
          state: data.reply?.to ? "ready" : "error",
          message: !data.reply?.to
            ? "No one to reply to in this thread."
            : hasDraft
              ? null
              : "Vyris thinks no reply is needed. Skip it, or write one below.",
        });
      } catch (err) {
        updateQueue(email.id, { state: "error", message: err instanceof Error ? err.message : "Couldn't draft." });
      }
    }
    setDrafting(false);
  }

  async function sendThreadReply(reply: ReplyTarget, text: string): Promise<void> {
    if (!reply.to) throw new Error("No one to reply to.");
    await postJson("/api/gmail/send", {
      to: reply.to,
      subject: reply.subject,
      message: text,
      threadId: reply.threadId,
      inReplyTo: reply.inReplyTo,
    });
  }

  async function sendQueued(item: QueueItem) {
    if (!item.summary?.reply || !item.draft.trim() || item.state === "sending" || item.state === "sent") return;
    updateQueue(item.email.id, { state: "sending", message: null });
    try {
      await sendThreadReply(item.summary.reply, item.draft);
      updateQueue(item.email.id, { state: "sent", message: "Sent." });
      markAnswered(item.email.id);
    } catch (err) {
      updateQueue(item.email.id, { state: "ready", message: err instanceof Error ? err.message : "Couldn't send." });
    }
  }

  /** force=true re-sorts everything; otherwise only emails without a remembered result. */
  async function prioritize(force = true) {
    if (triaging) return;
    setTriaging(true);
    setTriageError(null);
    try {
      const cache = readTriageCache();
      const knownIds = force ? [] : Object.keys(cache.results);
      const data = await postJson<{ results: Record<string, TriageResult>; projects?: Record<string, string> }>(
        "/api/ai/inbox/triage",
        { knownIds }
      );
      const results = { ...(force ? {} : cache.results), ...data.results };
      const projects = { ...cache.projects, ...(data.projects ?? {}) };
      writeTriageCache({ results: { ...cache.results, ...data.results }, projects });
      const current = new Set((emails ?? []).map((e) => e.id));
      setTriage(Object.fromEntries(Object.entries(results).filter(([id]) => current.has(id))));
      setTriageProjects(projects);
    } catch (err) {
      setTriageError(err instanceof Error ? err.message : "Couldn't sort your inbox.");
    } finally {
      setTriaging(false);
    }
  }

  async function summarize(id: string) {
    setSummarizing(true);
    setSummaryError(null);
    setReplyStatus(null);
    try {
      const res = await fetch("/api/ai/inbox/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't summarise this thread.");
      const result = data as SummaryResponse;
      setSummary(result);
      setDraft(result.replyDraft ?? "");
      if (result.reply?.to && !result.needsReply && !result.replyDraft?.trim()) markAnswered(id);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Couldn't summarise this thread.");
    } finally {
      setSummarizing(false);
    }
  }

  async function sendReply() {
    const reply = summary?.reply;
    if (!reply?.to || !draft.trim() || replySending) return;
    setReplySending(true);
    setReplyStatus(null);
    try {
      await sendThreadReply(reply, draft);
      setReplyStatus("Reply sent.");
      if (openEmailId) markAnswered(openEmailId);
    } catch (err) {
      setReplyStatus(err instanceof Error ? err.message : "Couldn't send.");
    } finally {
      setReplySending(false);
    }
  }

  function openCompose() {
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setComposeError(null);
    setComposeSuccess(false);
    setShowCompose(true);
  }

  async function handleSend() {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      setComposeError("To, subject, and message are all required.");
      return;
    }

    setSending(true);
    setComposeError(null);

    try {
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: composeTo.trim(),
          subject: composeSubject.trim(),
          message: composeBody,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setComposeError(
          res.status === 403
            ? "Reconnect Gmail to enable sending."
            : data.message ?? "Could not send the email."
        );
        return;
      }

      setComposeSuccess(true);
      setTimeout(() => setShowCompose(false), 1200);
    } catch {
      setComposeError("Could not reach Gmail.");
    } finally {
      setSending(false);
    }
  }

  async function openEmail(id: string) {
    setOpenEmailId(id);
    setSummary(null);
    setSummaryError(null);
    setDraft("");
    setReplyStatus(null);
    setOpenEmailBody(null);
    setOpenEmailError(null);
    setOpenEmailLoading(true);
    try {
      const res = await fetch(`/api/gmail/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setOpenEmailError(data.message ?? "Could not load this email.");
      } else {
        setOpenEmailBody({ html: data.bodyHtml, text: data.bodyText });
      }
    } catch {
      setOpenEmailError("Could not reach Gmail.");
    } finally {
      setOpenEmailLoading(false);
    }
  }

  return (
    <>
      <Topbar
        eyebrow="Overview"
        title="Inbox"
        statusText={
          status === "authenticated"
            ? unreadEmailCount > 0
              ? `${unreadEmailCount} unread`
              : "All caught up"
            : undefined
        }
      />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brass" strokeWidth={1.75} />
              <h2 className="font-display text-xl">Email</h2>
            </div>
            {status === "authenticated" && (
              <div className="flex items-center gap-2">
              {candidates.length > 0 && (
                <button
                  onClick={() => void draftReplies()}
                  disabled={drafting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-brass text-white disabled:opacity-50"
                >
                  {drafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  {drafting ? "Drafting..." : `Draft ${candidates.length} repl${candidates.length === 1 ? "y" : "ies"}`}
                </button>
              )}
              {emails && emails.length > 0 && (
                <button
                  onClick={() => void prioritize()}
                  disabled={triaging}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-panel-2 border border-line disabled:opacity-50"
                >
                  {triaging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  {triaging ? "Sorting..." : triage ? "Re-prioritize" : "Prioritize"}
                </button>
              )}
              <button
                onClick={openCompose}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-brass text-white hover:bg-brass/90"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                Compose
              </button>
              </div>
            )}
          </div>

          {triageError && (
            <div className="text-sm text-red-500" role="alert">
              {triageError}
            </div>
          )}

          {triage && emails && emails.length > 0 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inbox filters">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-colors",
                    filter === f ? "bg-brass text-white border-brass" : "bg-panel border-line text-muted hover:text-ink-text"
                  )}
                >
                  {FILTER_LABELS[f]} · {counts[f]}
                </button>
              ))}
            </div>
          )}

          {queue.length > 0 && (
            <Panel className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Replies ready for review</h3>
                  <p className="text-xs text-muted">
                    Vyris drafted these for work emails waiting on you. Nothing is sent until you click Send.
                  </p>
                </div>
                <button onClick={() => setQueue([])} className="text-xs text-muted hover:text-ink-text">
                  Close
                </button>
              </div>
              <div className="divide-y divide-line">
                {queue.map((q) => (
                  <div key={q.email.id} className={cn("py-4 space-y-2", (q.state === "sent" || q.state === "skipped") && "opacity-60")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{q.email.from}</div>
                        <div className="text-xs text-muted truncate">{q.email.subject}</div>
                      </div>
                      {q.state === "drafting" && <Loader2 className="w-4 h-4 animate-spin text-muted shrink-0" />}
                    </div>
                    {q.summary?.summary && <p className="text-xs text-ink-text/80">{q.summary.summary}</p>}
                    {(q.state === "ready" || q.state === "sending") && (
                      <>
                        <textarea
                          value={q.draft}
                          onChange={(e) => updateQueue(q.email.id, { draft: e.target.value })}
                          placeholder="Write a reply..."
                          rows={5}
                          className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brass"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[11px] text-muted mr-auto">To {q.summary?.reply?.to}</span>
                          <button
                            onClick={() => updateQueue(q.email.id, { state: "skipped", message: "Skipped." })}
                            className="px-3 py-1.5 rounded-lg text-xs text-muted hover:bg-black/[0.04]"
                          >
                            Skip
                          </button>
                          <button
                            onClick={() => void sendQueued(q)}
                            disabled={!q.draft.trim() || q.state === "sending"}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brass text-white disabled:opacity-50"
                          >
                            {q.state === "sending" ? "Sending..." : "Send"}
                          </button>
                        </div>
                      </>
                    )}
                    {q.message && (
                      <div
                        className={cn(
                          "text-xs",
                          q.state === "sent" ? "text-green-600" : q.state === "error" || q.state === "drafting" ? "text-red-500" : "text-muted"
                        )}
                      >
                        {q.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {status !== "authenticated" && (
            <Panel className="p-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium mb-1">Connect Gmail</div>
                <div className="text-xs text-muted">
                  See your real inbox here, and send with your permission — Vyris never deletes anything.
                </div>
              </div>
              <button
                onClick={() => signIn("google")}
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white"
              >
                Connect
              </button>
            </Panel>
          )}

          {status === "authenticated" && emailLoading && (
            <Panel className="p-6 text-sm text-muted">Loading your inbox...</Panel>
          )}

          {status === "authenticated" && emailError && (
            <Panel className="p-6 text-sm text-muted">
              {emailError}{" "}
              <button onClick={() => signIn("google")} className="text-brass underline">
                Reconnect
              </button>
            </Panel>
          )}

          {status === "authenticated" && !emailLoading && !emailError && emails && emails.length === 0 && (
            <Panel className="p-6 text-sm text-muted">Your inbox is empty.</Panel>
          )}

          {status === "authenticated" && !emailLoading && !emailError && emails && emails.length > 0 && (
            <Panel className="overflow-hidden">
              <div className="divide-y divide-line">
                {visibleEmails.length === 0 && (
                  <div className="px-6 py-6 text-sm text-muted">Nothing under {FILTER_LABELS[filter]}.</div>
                )}
                {visibleEmails.map((e) => {
                  const t = triage?.[e.id];
                  const waiting = daysWaiting(e.timestamp, new Date());
                  const showWaiting =
                    t && (t.priority === "urgent" || t.priority === "needs_reply") && waiting >= WAITING_DAYS;
                  return (
                  <div
                    key={e.id}
                    onClick={() => openEmail(e.id)}
                    className={cn(
                      "flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-black/[0.02]",
                      e.unread && "bg-brass-soft/50"
                    )}
                  >
                    <div className="shrink-0 rounded-lg p-2 bg-panel-2 text-muted">
                      <Mail className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {e.unread && <span className="w-1.5 h-1.5 rounded-full bg-signal shrink-0" />}
                        <div className="text-sm font-medium truncate">{e.from}</div>
                      </div>
                      <div className="text-xs text-ink-text/80 mt-0.5 truncate">{e.subject}</div>
                      <div className="text-xs text-muted mt-1 leading-relaxed line-clamp-1">
                        {e.snippet}
                      </div>
                      {t && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full", priorityStyle[t.priority].className)}>
                            {priorityStyle[t.priority].label}
                          </span>
                          {showWaiting && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">
                              Waiting {waiting} days
                            </span>
                          )}
                          {t.projectId && triageProjects[t.projectId] && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-panel-2 text-ink-text">
                              {triageProjects[t.projectId]}
                            </span>
                          )}
                          {t.reason && <span className="text-[11px] text-muted truncate">{t.reason}</span>}
                        </div>
                      )}
                      <div className="text-[11px] text-muted mt-1.5 font-mono">
                        {relativeTime(e.timestamp)}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </section>

        {showCompose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <Panel className="w-full max-w-md p-6 relative">
              <button
                onClick={() => setShowCompose(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-black/[0.06]"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>

              <h3 className="font-display text-lg mb-4">Compose</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted block mb-1">To</label>
                  <input
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    type="email"
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1">Subject</label>
                  <input
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1">Message</label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-line text-sm resize-none"
                  />
                </div>

                {composeError && <div className="text-xs text-red-600">{composeError}</div>}
                {composeSuccess && <div className="text-xs text-green-600">Sent.</div>}

                <button
                  onClick={handleSend}
                  disabled={sending || composeSuccess}
                  className="w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </Panel>
          </div>
        )}

        {openEmailId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <Panel className="w-full max-w-lg p-6 relative max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => setOpenEmailId(null)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-black/[0.06]"
                aria-label="Close"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>

              <div className="mb-4 pr-8">
                {!summary && (
                  <button
                    onClick={() => void summarize(openEmailId)}
                    disabled={summarizing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-brass text-white disabled:opacity-50"
                  >
                    {summarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />}
                    {summarizing ? "Reading the thread..." : "Summarize & draft reply"}
                  </button>
                )}
                {summaryError && <div className="text-xs text-red-500 mt-2">{summaryError}</div>}
                {summary && (
                  <div className="rounded-lg border border-line bg-panel-2 p-4 space-y-3">
                    {summary.summary && <p className="text-sm">{summary.summary}</p>}
                    {summary.keyPoints.length > 0 && (
                      <ul className="list-disc pl-5 text-xs space-y-1 text-ink-text/90">
                        {summary.keyPoints.map((k) => (
                          <li key={k}>{k}</li>
                        ))}
                      </ul>
                    )}
                    {summary.reply?.to ? (
                      <div className="space-y-2">
                        <div className="text-[11px] text-muted">
                          Reply to {summary.reply.to} · {summary.reply.subject}
                          {!summary.needsReply && " · no reply seems needed"}
                        </div>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={6}
                          className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brass"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-xs", replyStatus === "Reply sent." ? "text-green-600" : "text-red-500")}>
                            {replyStatus}
                          </span>
                          <button
                            onClick={() => void sendReply()}
                            disabled={!draft.trim() || replySending || replyStatus === "Reply sent."}
                            className="px-4 py-2 rounded-lg text-xs font-medium bg-brass text-white disabled:opacity-50"
                          >
                            {replySending ? "Sending..." : "Send reply"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted">No one to reply to in this thread.</div>
                    )}
                  </div>
                )}
              </div>

              {openEmailLoading && <div className="text-sm text-muted">Loading...</div>}
              {openEmailError && <div className="text-sm text-red-600">{openEmailError}</div>}
              {openEmailBody !== null && (
                openEmailBody.html ? (
                  <div
                    className="text-sm leading-relaxed pr-6"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(openEmailBody.html) }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed pr-6">
                    {openEmailBody.text}
                  </div>
                )
              )}
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}