"use client";

import { useRouter } from "next/navigation";
import { useUser, Role } from "@/lib/user-context";
import { cn } from "@/lib/utils";

const roles: { id: Role; label: string; description: string }[] = [
  { id: "CEO", label: "CEO", description: "Full organizational oversight, final decisions" },
  { id: "FOUNDER", label: "Founder", description: "Building the company, wears every hat" },
  { id: "EXECUTIVE", label: "Executive", description: "Leads a function, reports to the top" },
  { id: "MANAGER", label: "Manager", description: "Runs a team, executes against strategy" },
  { id: "OTHER", label: "Other", description: "Something else — vyris adapts either way" },
];

export default function RolePage() {
  const router = useRouter();
  const { role, setRole } = useUser();

  async function selectRole(r: Role) {
    await setRole(r);
  }

  function continueNext() {
    router.push("/onboarding/workspace");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full">
        <div className="text-[11px] uppercase tracking-[0.18em] text-brass mb-2">
          Step 1 of 2
        </div>
        <h1 className="font-display text-3xl mb-2">What&apos;s your role?</h1>
        <p className="text-sm text-muted mb-8">
          This helps Vyris prioritize what surfaces in your Command Center.
        </p>

        <div className="space-y-2">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => selectRole(r.id)}
              className={cn(
                "w-full text-left rounded-xl border px-5 py-4 transition-colors",
                role === r.id
                  ? "border-brass bg-brass-soft"
                  : "border-line bg-panel hover:bg-white/[0.02]"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-sm font-medium",
                    role === r.id ? "text-brass" : "text-ink-text"
                  )}
                >
                  {r.label}
                </span>
                {role === r.id && <span className="w-2 h-2 rounded-full bg-brass" />}
              </div>
              <div className="text-xs text-muted mt-1">{r.description}</div>
            </button>
          ))}
        </div>

        <button
          onClick={continueNext}
          disabled={!role}
          className={cn(
            "w-full mt-8 px-6 py-3 rounded-lg text-sm font-medium transition-opacity",
            role ? "bg-brass text-[#1a140a]" : "bg-panel-2 text-muted cursor-not-allowed opacity-60"
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
