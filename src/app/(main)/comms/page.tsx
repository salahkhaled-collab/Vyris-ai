"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { Mail, MessageSquare, Sparkles, Copy, Check } from "lucide-react";
import { DictationButton } from "@/components/ui/DictationButton";
import Link from "next/link";

interface TeamMsg {
  id: string;
  content: string;
  channel: "message" | "email";
  createdAt: string;
  authorId: string;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
}

interface DraftResult {
  subject: string;
  body: string;
}

// ── Draft with Vyris panel ────────────────────────────────────────────────────

function DraftPanel() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Load contacts + projects for the selectors
  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.ok ? r.json() : { contacts: [] })
      .then((d) => setContacts(d.contacts ?? []))
      .catch(() => {});
    fetch("/api/projects")
      .then((r) => r.ok ? r.json() : { projects: [] })
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
  }, []);

  const contact = contacts.find((c) => c.id === selectedContact) ?? null;
  const project = projects.find((p) => p.id === selectedProject) ?? null;

  async function handleDraft() {
    if (!draftNote.trim() || pending) return;
    setPending(true);
    setError(null);
    setDraft(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "draft_comms",
          context: {
            draftNote: draftNote.trim(),
            ...(contact && { contact: { name: contact.name, email: contact.email, company: contact.company, role: contact.role } }),
            ...(project && { project: { title: project.title, description: project.description } }),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.message ?? `Server error ${res.status}`); return; }
      setDraft({ subject: data.subject, body: data.body });
    } catch {
      setError("Could not reach Vyris. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function copyDraft() {
    if (!draft) return;
    const text = draft.subject ? `Subject: ${draft.subject}\n\n${draft.body}` : draft.body;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-signal" strokeWidth={1.75} />
        <h2 className="font-display text-lg">Draft with Vyris</h2>
        <span className="text-[10px] uppercase tracking-[0.14em] text-signal bg-signal/[0.12] px-2 py-0.5 rounded-full ml-1">
          AI
        </span>
      </div>

      <Panel className="p-6 space-y-4">
        {/* Context selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-muted block mb-1.5">
              Recipient (optional)
            </label>
            <select
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)}
              className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2.5 text-sm text-ink-text focus:outline-none focus:ring-1 focus:ring-brass"
            >
              <option value="">No specific recipient</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` · ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-[0.14em] text-muted block mb-1.5">
              Project context (optional)
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2.5 text-sm text-ink-text focus:outline-none focus:ring-1 focus:ring-brass"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rough note */}
        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-muted block mb-1.5">
            What do you want to say?
          </label>
          <div className="relative">
            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="e.g. Follow up on the Q3 partnership terms we discussed last week. Friendly but push for a decision by Friday."
              rows={3}
              className="w-full bg-panel-2 border border-line rounded-lg px-4 py-2.5 pr-12 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass resize-none"
            />
            <DictationButton
              onTranscript={(text) => setDraftNote((prev) => (prev ? `${prev} ${text}` : text))}
              className="absolute top-2 right-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {error && <p className="text-xs text-signal/80">{error}</p>}
          {!error && <span />}
          <button
            onClick={handleDraft}
            disabled={!draftNote.trim() || pending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-[#1a140a] disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
            {pending ? "Drafting…" : "Draft"}
          </button>
        </div>

        {/* Draft output */}
        {draft && (
          <div className="border-t border-line pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted">Vyris Draft</span>
              <button
                onClick={copyDraft}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-ink-text transition-colors"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-signal" strokeWidth={2} /> Copied</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" strokeWidth={1.75} /> Copy</>
                )}
              </button>
            </div>
            {draft.subject && (
              <div className="text-xs text-muted">
                <span className="text-ink-text/60">Subject: </span>
                <span className="font-medium text-ink-text">{draft.subject}</span>
              </div>
            )}
            <div className="bg-panel-2 rounded-lg px-4 py-3 text-sm text-ink-text/90 leading-relaxed whitespace-pre-wrap">
              {draft.body}
            </div>
            <button
              onClick={() => { setDraft(null); setDraftNote(""); setSelectedContact(""); setSelectedProject(""); }}
              className="text-xs text-muted hover:text-ink-text transition-colors"
            >
              Start over
            </button>
          </div>
        )}
      </Panel>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CommsPage() {
  const { data: session, status } = useSession();
  const [teamMessages, setTeamMessages] = useState<TeamMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    fetch("/api/team")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.message ?? "Could not load team messages."); return; }
        setTeamMessages(data.messages ?? []);
      })
      .catch(() => setError("Could not reach server."))
      .finally(() => setLoading(false));
  }, [status]);

  const sentByMe = teamMessages.filter((m) => m.authorId === session?.user?.id);

  return (
    <>
      <Topbar eyebrow="Operations" title="Communications" statusText="Activity log" />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-8">
        <p className="text-sm text-muted max-w-2xl">
          A combined log of what&apos;s gone out — team messages and Vyris&apos;s drafted
          replies. For your actual inbox, see{" "}
          <Link href="/inbox" className="text-brass hover:underline">
            Inbox
          </Link>
          .
        </p>

        {/* ── Draft with Vyris ── */}
        <DraftPanel />

        {/* ── Sent from Team ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brass" strokeWidth={1.75} />
            <h2 className="font-display text-lg">Sent from Team</h2>
          </div>

          {status !== "authenticated" && (
            <Panel className="p-6 text-sm text-muted">
              Sign in to see messages and emails you&apos;ve sent from the Team page.
            </Panel>
          )}

          {status === "authenticated" && loading && (
            <Panel className="p-6 text-sm text-muted">Loading...</Panel>
          )}

          {status === "authenticated" && error && (
            <Panel className="p-6 text-sm text-muted">{error}</Panel>
          )}

          {status === "authenticated" && !loading && !error && sentByMe.length === 0 && (
            <Panel className="p-6 text-sm text-muted">
              Nothing sent yet — messages and emails sent from Team will show up here
              once Team is available.
            </Panel>
          )}

          {status === "authenticated" && !loading && !error && sentByMe.length > 0 && (
            <Panel className="overflow-hidden">
              <div className="divide-y divide-line">
                {sentByMe
                  .slice()
                  .reverse()
                  .map((m) => (
                    <div key={m.id} className="flex items-start gap-3 px-6 py-4">
                      <div
                        className={cn(
                          "shrink-0 rounded-lg p-2",
                          m.channel === "email" ? "bg-brass-soft text-brass" : "bg-panel-2 text-muted"
                        )}
                      >
                        {m.channel === "email" ? (
                          <Mail className="w-4 h-4" strokeWidth={1.75} />
                        ) : (
                          <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{m.content}</div>
                        <div className="text-[11px] text-muted mt-1 font-mono">
                          {new Date(m.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Panel>
          )}
        </section>
      </main>
    </>
  );
}
