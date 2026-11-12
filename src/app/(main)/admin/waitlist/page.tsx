"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search, Users } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Panel } from "@/components/ui/Panel";

interface Entry {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  source: string | null;
  createdAt: string;
}

/** Owner-only list of waitlist sign-ups (ADMIN_EMAILS). */
export default function WaitlistAdminPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ok" | "closed" | "error">("loading");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/waitlist", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404 || r.status === 401) return setState("closed");
        if (!r.ok) return setState("error");
        const d = (await r.json()) as { total: number; entries: Entry[] };
        setEntries(d.entries);
        setTotal(d.total);
        setState("ok");
      })
      .catch(() => setState("error"));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!entries || !q) return entries ?? [];
    return entries.filter((e) => [e.name, e.email, e.company, e.source].some((v) => v?.toLowerCase().includes(q)));
  }, [entries, query]);

  const thisWeek = (entries ?? []).filter((e) => Date.now() - new Date(e.createdAt).getTime() < 7 * 86_400_000).length;

  return (
    <>
      <Topbar eyebrow="Owner" title="Waitlist" titleIcon={Users} />
      <main className="flex-1 overflow-y-auto scroll-thin px-6 lg:px-10 py-8 space-y-6">
        {state === "loading" && <p className="text-sm text-muted py-8 text-center">Loading…</p>}
        {state === "error" && (
          <p role="alert" className="text-sm text-red-600">
            Couldn&apos;t load the waitlist. Refresh to try again.
          </p>
        )}
        {state === "closed" && (
          <Panel className="p-6">
            <h2 className="font-display text-xl mb-1">Not available</h2>
            <p className="text-sm text-muted">
              This page is only for the Vyris owner. If that&apos;s you, add your email to the ADMIN_EMAILS setting in
              Vercel and redeploy.
            </p>
          </Panel>
        )}
        {state === "ok" && entries && (
          <>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <Panel className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted">Total</div>
                <div className="font-display text-3xl">{total}</div>
              </Panel>
              <Panel className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted">Last 7 days</div>
                <div className="font-display text-3xl">{thisWeek}</div>
              </Panel>
            </div>

            {entries.length === 0 ? (
              <Panel className="p-6">
                <h2 className="font-display text-xl mb-1">No sign-ups yet</h2>
                <p className="text-sm text-muted">
                  When someone joins at vyris-waitlist.vercel.app or the home page, they&apos;ll appear here.
                </p>
              </Panel>
            ) : (
              <Panel className="p-0 overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-line">
                  <div className="relative flex-1 min-w-[12rem]">
                    <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search name, email, company"
                      aria-label="Search the waitlist"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-panel-2 text-sm focus:outline-none focus:ring-1 focus:ring-brass"
                    />
                  </div>
                  <a
                    href="/api/admin/waitlist?format=csv"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brass text-white"
                  >
                    <Download className="w-4 h-4" /> Download CSV
                  </a>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-5 py-2 font-medium">Joined</th>
                        <th className="px-5 py-2 font-medium">Name</th>
                        <th className="px-5 py-2 font-medium">Email</th>
                        <th className="px-5 py-2 font-medium">Company</th>
                        <th className="px-5 py-2 font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((e) => (
                        <tr key={e.id} className="border-t border-line">
                          <td className="px-5 py-2.5 whitespace-nowrap text-muted">
                            {new Date(e.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                          </td>
                          <td className="px-5 py-2.5">{e.name ?? "—"}</td>
                          <td className="px-5 py-2.5">
                            <a href={`mailto:${e.email}`} className="hover:underline">
                              {e.email}
                            </a>
                          </td>
                          <td className="px-5 py-2.5">{e.company ?? "—"}</td>
                          <td className="px-5 py-2.5 text-muted">{e.source ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {shown.length === 0 && <p className="text-sm text-muted px-5 py-4">No matches.</p>}
              </Panel>
            )}
          </>
        )}
      </main>
    </>
  );
}
