"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { Mail } from "lucide-react";

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
        {/* Real Gmail section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-brass" strokeWidth={1.75} />
            <h2 className="font-display text-xl">Email</h2>
          </div>

          {status !== "authenticated" && (
            <Panel className="p-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium mb-1">Connect Gmail</div>
                <div className="text-xs text-muted">
                  See your real inbox here, read-only — Vyris never sends or deletes anything.
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
                    className={cn(
                      "flex items-start gap-4 px-6 py-4",
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
      </main>
    </>
  );
}
