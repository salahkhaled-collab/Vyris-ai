"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { useUser, type Role, type WorkspaceType } from "@/lib/user-context";
import { LogOut, AlertTriangle } from "lucide-react";

const ROLES: { value: Role; label: string }[] = [
  { value: "CEO", label: "CEO" },
  { value: "FOUNDER", label: "Founder" },
  { value: "EXECUTIVE", label: "Executive" },
  { value: "MANAGER", label: "Manager" },
  { value: "OTHER", label: "Other" },
];

const WORKSPACES: { value: WorkspaceType; label: string; hint: string }[] = [
  { value: "PERSONAL", label: "Personal", hint: "Just you" },
  { value: "TEAM", label: "Team", hint: "You and collaborators" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const { role, workspaceType, loading, setRole, setWorkspaceType } = useUser();
  const [savingRole, setSavingRole] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const emailMatches =
    !!session?.user?.email &&
    deleteEmailInput.trim().toLowerCase() === session.user.email.toLowerCase();

  async function handleDeleteAccount() {
    if (!emailMatches || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: deleteEmailInput.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Could not delete account.");
      }
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete account.");
      setDeleting(false);
    }
  }

  async function handleRoleChange(next: Role) {
    setSavingRole(true);
    try {
      await setRole(next);
    } finally {
      setSavingRole(false);
    }
  }

  async function handleWorkspaceChange(next: WorkspaceType) {
    setSavingWorkspace(true);
    try {
      await setWorkspaceType(next);
    } finally {
      setSavingWorkspace(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto scroll-thin">
      <Topbar eyebrow="Account" title="Settings" />

      <div className="max-w-2xl w-full mx-auto px-6 lg:px-10 py-10 space-y-8">
        {/* Account */}
        <section className="bg-panel border border-line rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Account</h2>
          <div className="flex items-center gap-4">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-brass-soft" />
            )}
            <div className="min-w-0">
              <div className="text-sm text-ink-text truncate">
                {session?.user?.name ?? "Account"}
              </div>
              <div className="text-xs text-muted truncate">
                {session?.user?.email ?? "—"}
              </div>
            </div>
          </div>
        </section>

        {/* Role */}
        <section className="bg-panel border border-line rounded-2xl p-6">
          <h2 className="font-display text-xl mb-1">Role</h2>
          <p className="text-sm text-muted mb-4">
            Helps Vyris tailor guidance to how you operate.
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                disabled={loading || savingRole}
                onClick={() => handleRoleChange(r.value)}
                className={`px-4 py-2 rounded-full text-sm transition-colors disabled:opacity-50 ${
                  role === r.value
                    ? "bg-brass text-white"
                    : "bg-panel-2 text-muted hover:text-ink-text"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </section>

        {/* Workspace */}
        <section className="bg-panel border border-line rounded-2xl p-6">
          <h2 className="font-display text-xl mb-1">Workspace</h2>
          <p className="text-sm text-muted mb-4">
            Switching to Team creates a shared workspace you can invite
            others into from the Team page.
          </p>
          <div className="flex gap-3">
            {WORKSPACES.map((w) => (
              <button
                key={w.value}
                disabled={loading || savingWorkspace}
                onClick={() => handleWorkspaceChange(w.value)}
                className={`flex-1 text-left px-4 py-3 rounded-xl border text-sm transition-colors disabled:opacity-50 ${
                  workspaceType === w.value
                    ? "border-brass bg-brass-soft text-ink-text"
                    : "border-line bg-panel-2 text-muted hover:text-ink-text"
                }`}
              >
                <div className="font-medium">{w.label}</div>
                <div className="text-xs text-muted">{w.hint}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Legal */}
        <section className="bg-panel border border-line rounded-2xl p-6">
          <h2 className="font-display text-xl mb-4">Legal</h2>
          <div className="flex gap-6 text-sm">
            <a href="/privacy" className="text-brass hover:underline">
              Privacy Policy
            </a>
            <a href="/terms" className="text-brass hover:underline">
              Terms of Service
            </a>
          </div>
        </section>

        {/* Danger zone */}
        <section className="bg-panel border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" strokeWidth={1.75} />
            <h2 className="font-display text-xl">Danger zone</h2>
          </div>
          <p className="text-sm text-muted mb-4">
            Permanently deletes your account and everything you own — decisions,
            objectives, bets, risks, contacts, documents, and projects. This
            cannot be undone.
          </p>

          {!deleteConfirming ? (
            <button
              onClick={() => setDeleteConfirming(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/15 transition-colors"
            >
              Delete account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                Type your email (<span className="font-medium">{session?.user?.email}</span>) to confirm:
              </p>
              <input
                value={deleteEmailInput}
                onChange={(e) => setDeleteEmailInput(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {deleteError && <div className="text-sm text-red-500">{deleteError}</div>}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={!emailMatches || deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white disabled:opacity-40"
                >
                  {deleting ? "Deleting..." : "Permanently delete my account"}
                </button>
                <button
                  onClick={() => { setDeleteConfirming(false); setDeleteEmailInput(""); setDeleteError(null); }}
                  className="text-sm text-muted hover:text-ink-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Sign out */}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink-text transition-colors"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </div>
  );
}
