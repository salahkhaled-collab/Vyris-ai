"use client";

import { useState } from "react";
import { Mail, Link as LinkIcon, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteResult {
  inviteUrl: string;
  email: string | null;
  emailSent: boolean | null;
  emailError: string | null;
}

export function InvitePanel({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createInvite(withEmail: boolean) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withEmail && email.trim() ? { email: email.trim() } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Could not create invite.");
        return;
      }
      setResult(data);
    } catch {
      setError("Something went wrong creating the invite.");
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    if (!result?.inviteUrl) return;
    navigator.clipboard.writeText(result.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
      <div className="w-full max-w-md bg-panel border border-line rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl">Invite a teammate</h3>
          <button onClick={onClose} className="text-muted hover:text-ink-text">
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {!result && (
          <>
            <p className="text-sm text-muted mb-4">
              Send an email invite, or generate a shareable link — either way,
              they join your team the moment they sign in and accept.
            </p>

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@company.com"
                className="w-full bg-panel-2 border border-line rounded-lg px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brass"
              />
              <button
                onClick={() => createInvite(true)}
                disabled={sending || !email.trim()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium",
                  email.trim() ? "bg-brass text-[#1a140a]" : "bg-panel-2 text-muted cursor-not-allowed"
                )}
              >
                <Mail className="w-4 h-4" strokeWidth={2} />
                {sending ? "Sending..." : "Send email invite"}
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-line" />
                <span className="text-[11px] text-muted">or</span>
                <div className="flex-1 h-px bg-line" />
              </div>

              <button
                onClick={() => createInvite(false)}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-panel-2"
              >
                <LinkIcon className="w-4 h-4" strokeWidth={1.75} />
                {sending ? "Generating..." : "Generate shareable link"}
              </button>
            </div>

            {error && <div className="text-xs text-signal/80 mt-3">{error}</div>}
          </>
        )}

        {result && (
          <div className="space-y-4">
            {result.email && (
              <div className="text-sm">
                {result.emailSent ? (
                  <span className="text-signal">Invite emailed to {result.email}.</span>
                ) : (
                  <span className="text-muted">
                    Invite created, but the email couldn&apos;t be sent
                    {result.emailError ? ` (${result.emailError})` : ""}. Share the link
                    below instead.
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                readOnly
                value={result.inviteUrl}
                className="flex-1 bg-panel-2 border border-line rounded-lg px-3 py-2 text-xs font-mono text-muted truncate"
              />
              <button
                onClick={copyLink}
                className="shrink-0 p-2 rounded-lg bg-brass text-[#1a140a]"
                aria-label="Copy link"
              >
                {copied ? <Check className="w-4 h-4" strokeWidth={2} /> : <LinkIcon className="w-4 h-4" strokeWidth={2} />}
              </button>
            </div>

            <p className="text-[11px] text-muted">Expires in 7 days.</p>

            <button onClick={onClose} className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-panel-2">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
