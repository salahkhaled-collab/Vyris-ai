"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { Mail, Pencil, X } from "lucide-react";

interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  unread: boolean;
  timestamp: string;
}

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
  const [openEmailBody, setOpenEmailBody] = useState<string | null>(null);
  const [openEmailLoading, setOpenEmailLoading] = useState(false);
  const [openEmailError, setOpenEmailError] = useState<string | null>(null);

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
    setOpenEmailBody(null);
    setOpenEmailError(null);
    setOpenEmailLoading(true);
    try {
      const res = await fetch(`/api/gmail/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setOpenEmailError(data.message ?? "Could not load this email.");
      } else {
        setOpenEmailBody(data.body);
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
              <button
                onClick={openCompose}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-brass text-white hover:bg-brass/90"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                Compose
              </button>
            )}
          </div>

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
                {emails.map((e) => (
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
                      <div className="text-[11px] text-muted mt-1.5 font-mono">
                        {relativeTime(e.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
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

              {openEmailLoading && <div className="text-sm text-muted">Loading...</div>}
              {openEmailError && <div className="text-sm text-red-600">{openEmailError}</div>}
              {openEmailBody !== null && (
                <div className="whitespace-pre-wrap text-sm leading-relaxed pr-6">{openEmailBody}</div>
              )}
            </Panel>
          </div>
        )}
      </main>
    </>
  );
}