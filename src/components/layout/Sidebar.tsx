"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation, settingsItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/user-context";
import { useSession, signIn, signOut } from "next-auth/react";

export function Sidebar() {
  const pathname = usePathname();
  const { workspaceType, role } = useUser();
  const { data: session } = useSession();

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-panel border-r border-line">
      <div className="px-6 py-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border border-brass flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-brass" />
        </div>
        <div>
          <div className="font-display text-lg tracking-wide">Vela</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted">
            Chief of Staff
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scroll-thin">
        {navigation.map((group) => {
          const items = group.items.filter(
            (item) => item.href !== "/team" || workspaceType === "TEAM"
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-[0.18em] text-muted first:pt-2">
                {group.label}
              </div>
              {items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-brass-soft text-brass font-medium shadow-[inset_2px_0_0_0_#5B8AF5]"
                        : "text-muted hover:text-ink-text hover:bg-white/[0.03]"
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-line">
        <Link
          href={settingsItem.href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            pathname === settingsItem.href
              ? "bg-brass-soft text-brass font-medium"
              : "text-muted hover:text-ink-text hover:bg-white/[0.03]"
          )}
        >
          <settingsItem.icon className="w-4 h-4" strokeWidth={1.75} />
          {settingsItem.label}
        </Link>
        {session?.user ? (
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-brass-soft" />
            )}
            <div className="text-sm min-w-0 flex-1">
              <div className="text-[13px] truncate">{session.user.name ?? "Account"}</div>
              <div className="text-[11px] text-muted">{role ?? "Principal"}</div>
            </div>
            <button
              onClick={() => signOut()}
              className="text-[11px] text-muted hover:text-ink-text transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            <div className="w-7 h-7 rounded-full bg-brass-soft" />
            <div className="text-sm flex-1">
              <div className="text-[13px]">Salah</div>
              <div className="text-[11px] text-muted">{role ?? "Principal"}</div>
            </div>
            <button
              onClick={() => signIn("google")}
              className="text-[11px] text-brass hover:underline"
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
