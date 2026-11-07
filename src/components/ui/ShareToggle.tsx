"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { ShareableType } from "@/lib/sharing";

// One request per page load, shared by every toggle on the page.
let teamStatus: Promise<boolean> | null = null;
function hasTeam(): Promise<boolean> {
  teamStatus ??= fetch("/api/team/members")
    .then((r) => (r.ok ? r.json() : { members: [] }))
    .then((d: { members?: unknown[] }) => Array.isArray(d.members) && d.members.length > 1)
    .catch(() => false);
  return teamStatus;
}

/**
 * "Share with team" / "Make private" for one record. Renders nothing unless the
 * viewer owns the record and has a team. The server enforces both rules too.
 */
export function ShareToggle({
  type,
  id,
  ownerId,
  teamId,
  onChange,
  className,
}: {
  type: ShareableType;
  id: string;
  ownerId: string;
  teamId: string | null;
  onChange?: (teamId: string | null) => void;
  className?: string;
}) {
  const { data: session } = useSession();
  const [team, setTeam] = useState(false);
  const [shared, setShared] = useState(Boolean(teamId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void hasTeam().then((v) => active && setTeam(v));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => setShared(Boolean(teamId)), [teamId]);

  if (!team || session?.user?.id !== ownerId) return null;

  async function toggle() {
    if (busy) return;
    const next = !shared;
    setBusy(true);
    setError(null);
    setShared(next);
    try {
      const res = await fetch("/api/sharing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, share: next }),
      });
      const data: { teamId?: string | null; message?: string } = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't change sharing.");
      onChange?.(data.teamId ?? null);
    } catch (err: unknown) {
      setShared(!next);
      setError(err instanceof Error ? err.message : "Couldn't change sharing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={() => void toggle()}
      disabled={busy}
      title={error ?? undefined}
      className={cn(
        "text-[11px] whitespace-nowrap hover:underline disabled:opacity-50",
        error ? "text-red-500" : "text-brass",
        className
      )}
    >
      {error ? "Retry sharing" : shared ? "Make private" : "Share with team"}
    </button>
  );
}
