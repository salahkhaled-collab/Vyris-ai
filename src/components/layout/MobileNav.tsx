"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { navigation, settingsItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Mail, Menu, Sparkles, X } from "lucide-react";
import { ASK_STATE_EVENT, closeAskVyris, openAskVyris } from "@/lib/ask-vyris";
import { VyrisMark } from "@/components/ui/VyrisMark";
import { FeedbackButton } from "@/components/layout/FeedbackButton";

const allItems = navigation.flatMap((g) => g.items);
const todayItem = allItems.find((i) => i.href === "/dashboard");
const inboxItem = allItems.find((i) => i.href === "/inbox");
const projectsItem = allItems.find((i) => i.href === "/projects");
// Phones: the daily screens plus the assistant in the middle. Everything else is under More.
const PRIMARY = [todayItem?.href, inboxItem?.href, projectsItem?.href];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    const onState = (e: Event) => setAskOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener(ASK_STATE_EVENT, onState);
    return () => window.removeEventListener(ASK_STATE_EVENT, onState);
  }, []);

  const isActive = (href?: string) => !askOpen && Boolean(href) && pathname === href;
  const moreActive = !askOpen && !PRIMARY.includes(pathname);
  const tab = (active: boolean) =>
    cn("flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-brass" : "text-muted");

  return (
    <>
      {/* Bottom bar — mobile/tablet only */}
      <nav
        aria-label="Main"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-panel border-t border-line flex items-stretch h-16 px-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {todayItem && (
          <Link href={todayItem.href} onClick={closeAskVyris} className={tab(isActive(todayItem.href))} aria-current={isActive(todayItem.href) ? "page" : undefined}>
            <todayItem.icon className="w-[22px] h-[22px]" strokeWidth={1.75} />
            Today
          </Link>
        )}
        {inboxItem && (
          <Link href={inboxItem.href} onClick={closeAskVyris} className={tab(isActive(inboxItem.href))} aria-current={isActive(inboxItem.href) ? "page" : undefined}>
            <Mail className="w-[22px] h-[22px]" strokeWidth={1.75} />
            Inbox
          </Link>
        )}
        <button
          onClick={() => openAskVyris({ toggle: true })}
          aria-label={askOpen ? "Close Ask Vyris" : "Ask Vyris"}
          aria-pressed={askOpen}
          className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium"
        >
          <span className={cn("w-[52px] h-9 rounded-full flex items-center justify-center text-white", askOpen ? "bg-ink-text" : "bg-brass")}>
            <Sparkles className="w-5 h-5" strokeWidth={1.75} />
          </span>
          <span className={askOpen ? "text-ink-text" : "text-brass"}>Ask Vyris</span>
        </button>
        {projectsItem && (
          <Link href={projectsItem.href} onClick={closeAskVyris} className={tab(isActive(projectsItem.href))} aria-current={isActive(projectsItem.href) ? "page" : undefined}>
            <projectsItem.icon className="w-[22px] h-[22px]" strokeWidth={1.75} />
            Projects
          </Link>
        )}
        <button
          onClick={() => {
            closeAskVyris();
            setDrawerOpen(true);
          }}
          className={tab(moreActive)}
        >
          <Menu className="w-[22px] h-[22px]" strokeWidth={1.75} />
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
              {/* Opens above the menu; closing the menu first would unmount the dialog. */}
              <FeedbackButton
                className="w-full flex items-center gap-3 rounded-md px-3 py-3 text-sm text-muted hover:text-ink-text transition-colors"
              />
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
