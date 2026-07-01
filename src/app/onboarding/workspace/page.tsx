"use client";

import { useRouter } from "next/navigation";
import { useUser, WorkspaceType } from "@/lib/user-context";
import { cn } from "@/lib/utils";
import { User, Users } from "lucide-react";

const options: {
  id: WorkspaceType;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    id: "PERSONAL",
    label: "Personal",
    description:
      "Just you and vyris. Your dashboard, decisions, and automations stay private.",
    icon: User,
  },
  {
    id: "TEAM",
    label: "Team",
    description:
      "Bring your team in. Adds a shared workspace where you can message members and send emails from vyris.",
    icon: Users,
  },
];

export default function WorkspacePage() {
  const router = useRouter();
  const { workspaceType, setWorkspaceType, completeOnboarding, role } = useUser();

  async function selectType(t: WorkspaceType) {
    await setWorkspaceType(t);
  }

  async function finish() {
    await completeOnboarding();
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full">
        <div className="text-[11px] uppercase tracking-[0.18em] text-brass mb-2">
          Step 2 of 2
        </div>
        <h1 className="font-display text-3xl mb-2">How will you use Vyris?</h1>
        <p className="text-sm text-muted mb-8">
          {role
            ? `As ${role === "OTHER" ? "your role" : `a ${role.charAt(0) + role.slice(1).toLowerCase()}`}, you can switch this later in Settings.`
            : "You can switch this later in Settings."}
        </p>

        <div className="space-y-3">
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = workspaceType === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => selectType(opt.id)}
                className={cn(
                  "w-full text-left rounded-xl border px-5 py-5 transition-colors flex gap-4",
                  active ? "border-brass bg-brass-soft" : "border-line bg-panel hover:bg-white/[0.02]"
                )}
              >
                <div
                  className={cn(
                    "shrink-0 rounded-lg p-2.5 h-fit",
                    active ? "bg-brass/20 text-brass" : "bg-panel-2 text-muted"
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <div className={cn("text-sm font-medium mb-1", active ? "text-brass" : "text-ink-text")}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-muted leading-relaxed">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={finish}
          disabled={!workspaceType}
          className={cn(
            "w-full mt-8 px-6 py-3 rounded-lg text-sm font-medium transition-opacity",
            workspaceType ? "bg-brass text-[#1a140a]" : "bg-panel-2 text-muted cursor-not-allowed opacity-60"
          )}
        >
          Enter Vyris
        </button>
      </div>
    </div>
  );
}
