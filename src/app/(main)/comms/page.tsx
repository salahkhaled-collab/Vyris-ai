"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import { Mail, MessageSquare, Bot, Inbox as InboxIcon } from "lucide-react";
import Link from "next/link";

interface TeamMsg {
  id: string;
  content: string;
  channel: "message" | "email";
  createdAt: string;
  authorId: string;
}

export default function CommsPage() {
  const { data: session, status } = useSession();
  const [teamMessages, setTeamMessages] = useState<TeamMsg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    fetch("/api/team")
      .then((res) => res.json())
      .then((data) => setTeamMessages(data.messages ?? []))
      .finally(() => setLoading(false));
  }, [status]);

  const sentByMe = teamMessages.filter((m) => m.authorId === session?.user?.id);

  return (
    <>
      <Topbar eyebrow="Operations" title="Communications" statusText="Activity log" />

      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-8">
        <p className="text-sm text-muted max-w-2xl">
          A combined log of what&apos;s gone out — team messages and vyris&apos;s drafted
          replies. For your actual inbox, see{" "}
          <Link href="/inbox" className="text-brass hover:underline">
            Inbox
          </Link>
          ; for direct conversations, see{" "}
          <Link href="/team" className="text-brass hover:underline">
            Team
          </Link>
          .
        </p>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-signal" strokeWidth={1.75} />
            <h2 className="font-display text-lg">vyris Drafts</h2>
          </div>
          <Panel className="p-6">
            <div className="flex items-center gap-3 text-sm text-muted">
              <InboxIcon className="w-4 h-4" strokeWidth={1.75} />
              <span>
                11 draft replies are waiting for your approval in{" "}
                <Link href="/automation" className="text-brass hover:underline">
                  AI &amp; Automation
                </Link>
                .
              </span>
            </div>
          </Panel>
        </section>

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

          {status === "authenticated" && !loading && sentByMe.length === 0 && (
            <Panel className="p-6 text-sm text-muted">
              Nothing sent yet — messages and emails you send from{" "}
              <Link href="/team" className="text-brass hover:underline">
                Team
              </Link>{" "}
              will show up here.
            </Panel>
          )}

          {status === "authenticated" && !loading && sentByMe.length > 0 && (
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
