"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export type Role = "CEO" | "FOUNDER" | "EXECUTIVE" | "MANAGER" | "OTHER";
export type WorkspaceType = "PERSONAL" | "TEAM";

interface UserProfile {
  role: Role | null;
  workspaceType: WorkspaceType | null;
  onboarded: boolean;
}

interface UserContextValue extends UserProfile {
  loading: boolean;
  setRole: (role: Role) => Promise<void>;
  setWorkspaceType: (type: WorkspaceType) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const defaultProfile: UserProfile = {
  role: null,
  workspaceType: null,
  onboarded: false,
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      setProfile(defaultProfile);
      setLoading(status === "loading");
      return;
    }

    let active = true;
    setLoading(true);
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setProfile({
          role: data.role ?? null,
          workspaceType: data.workspaceType ?? null,
          onboarded: data.onboarded ?? false,
        });
      })
      .catch(() => {
        if (active) setProfile(defaultProfile);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status]);

  const patch = useCallback(async (body: Partial<UserProfile>) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setProfile((p) => ({ ...p, ...updated }));
    } else {
      const data = await res.json().catch(() => ({}));
      console.error("Profile update failed:", res.status, data);
      throw new Error(data.message ?? `Could not save (${res.status}). Try again.`);
    }
  }, []);

  const value: UserContextValue = {
    ...profile,
    loading,
    setRole: (role) => patch({ role }),
    setWorkspaceType: (workspaceType) => patch({ workspaceType }),
    completeOnboarding: () => patch({ onboarded: true }),
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
