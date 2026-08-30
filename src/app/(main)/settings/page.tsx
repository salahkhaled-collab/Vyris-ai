"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Topbar } from "@/components/layout/Topbar";
import { useUser, type Role, type WorkspaceType } from "@/lib/user-context";
import { LogOut } from "lucide-react";

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
