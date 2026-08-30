"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { navigation, settingsItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Target, GitBranch, Menu, X } from "lucide-react";
import { VyrisMark } from "@/components/ui/VyrisMark";

const advisoryGroup = navigation.find((g) => g.label === "Advisory");
const strategyItem = advisoryGroup?.items.find((i) => i.href === "/strategy");
const decisionsItem = advisoryGroup?.items.find((i) => i.href === "/decisions");

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bottomBarActive = (href?: string) => href && pathname === href;
  // "More" is active whenever we're on a page that isn't one of the two
  // primary bottom-bar destinations — covers everything the drawer holds.
  const moreActive =
    pathname !== strategyItem?.href && pathname !== decisionsItem?.href;

  return (
    <>
      {/* Bottom bar — mobile/tablet only */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-panel border-t border-line flex items-stretch h-16"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {strategyItem && (
          <Link
            href={strategyItem.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-[11px]",
              bottomBarActive(strategyItem.href) ? "text-brass" : "text-muted"
            )}
          >
            <Target className="w-5 h-5" strokeWidth={1.75} />
            Strategy
          </Link>
        )}
        {decisionsItem && (
          <Link
            href={decisionsItem.href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-[11px]",
              bottomBarActive(decisionsItem.href) ? "text-brass" : "text-muted"
            )}
          >
            <GitBranch className="w-5 h-5" strokeWidth={1.75} />
            Decisions
          </Link>
        )}
        <button
          onClick={() => setDrawerOpen(true)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 text-[11px]",
            moreActive ? "text-brass" : "text-muted"
          )}
        >
          <Menu className="w-5 h-5" strokeWidth={1.75} />
          More
        </button>
      </nav>

      {/* Full-screen grouped drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-ink flex flex-col">
          <div className="px-6 py-5 flex items-center justify-between border-b border-line">
            <div className="flex items-center gap-3">
              <VyrisMark size="md" />
              <span className="font-display text-lg tracking-wide">Vyris</span>
            </div>
            <button onClick={() => setDrawerOpen(false)} aria-label="Close menu">
              <X className="w-5 h-5 text-muted" strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scroll-thin px-3 py-4">
            {navigation.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-muted">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors",
                        active
                          ? "bg-brass-soft text-brass font-medium"
                          : "text-muted hover:text-ink-text"
                      )}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="mt-2 pt-2 border-t border-line">
              <Link
                href={settingsItem.href}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors",
                  pathname === settingsItem.href
                    ? "bg-brass-soft text-brass font-medium"
                    : "text-muted hover:text-ink-text"
                )}
              >
                <settingsItem.icon className="w-4 h-4" strokeWidth={1.75} />
                {settingsItem.label}
              </Link>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-line">
            {session?.user ? (
              <div className="flex items-center gap-3">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brass-soft" />
                )}
                <div className="text-sm min-w-0 flex-1">
                  <div className="truncate">{session.user.name ?? "Account"}</div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-muted hover:text-ink-text transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brass-soft" />
                <div className="text-sm flex-1">Not signed in</div>
                <button
                  onClick={() => signIn("google")}
                  className="text-xs text-brass hover:underline"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
