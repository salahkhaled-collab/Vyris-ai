"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Mail, X } from "lucide-react";

interface SavedEmail {
  id: string;
  threadId: string;
  subject: string;
  fromName: string;
  snippet: string;
  receivedAt: string;
  linkedById: string;
}

/** Emails saved to a project from the Inbox. Loads when the project is expanded. */
export function ProjectEmails({
  projectId,
  myId,
  isOwner,
}: {
  projectId: string;
  myId: string | null;
  isOwner: boolean;
}) {
  const [emails, setEmails] = useState<SavedEmail[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/projects/${encodeURIComponent(projectId)}/emails`)
      .then((r) => (r.ok ? r.json() : { emails: [] }))
      .then((d: { emails?: SavedEmail[] }) => active && setEmails(d.emails ?? []))
      .catch(() => active && setEmails([]));
    return () => {
      active = false;
    };
  }, [projectId]);

  async function unlink(id: string) {
    const prev = emails;
    setEmails((list) => (list ?? []).filter((e) => e.id !== id));
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/emails?linkId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!res?.ok) setEmails(prev);
  }

  if (!emails || emails.length === 0) return null;

  return (
    <div className="px-6 py-4 border-t border-line">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted mb-2">
        <Mail className="w-3.5 h-3.5" strokeWidth={1.75} />
        Emails ({emails.length})
      </div>
      <ul className="space-y-2">
        {emails.map((e) => (
          <li key={e.id} className="flex items-start gap-2 group">
            <div className="min-w-0 flex-1">
              <a
                href={`https://mail.google.com/mail/u/0/#all/${encodeURIComponent(e.threadId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline inline-flex items-center gap-1"
              >
                {e.subject}
                <ExternalLink className="w-3 h-3 opacity-50" strokeWidth={1.75} />
              </a>
              <div className="text-xs text-muted truncate">
                {e.fromName} · {new Date(e.receivedAt).toLocaleDateString([], { month: "short", day: "numeric" })} ·{" "}
                {e.snippet}
              </div>
            </div>
            {(e.linkedById === myId || isOwner) && (
              <button
                onClick={() => void unlink(e.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-black/[0.06]"
                aria-label={`Remove "${e.subject}" from this project`}
              >
                <X className="w-3.5 h-3.5 text-muted" strokeWidth={1.75} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
