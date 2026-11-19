"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import { connectGoogle } from "@/lib/google-connect";
import type { GoogleFeature } from "@/lib/google-scopes";
import { track } from "@/lib/analytics";

/**
 * Shown before sending someone to Google. While Vyris is in Google's review,
 * Google shows a "Google hasn't verified this app" screen; most people quit
 * there unless they were told what it is and how to get past it.
 */
export function GoogleConnectDialog({
  open,
  onClose,
  features,
  returnTo,
}: {
  open: boolean;
  onClose: () => void;
  features: GoogleFeature[];
  returnTo?: string;
}) {
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    continueRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const what = features.includes("gmail") && features.includes("calendar")
    ? "Gmail and Calendar"
    : features.includes("calendar")
      ? "Calendar"
      : "Gmail";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gcd-title"
        className="w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 id="gcd-title" className="font-display text-xl">
            Before you go to Google
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-black/[0.06]">
            <X className="w-4 h-4 text-muted" strokeWidth={1.75} />
          </button>
        </div>
        <p className="text-sm text-muted mb-3">
          Vyris is still in Google&apos;s app review, so Google will show a screen saying{" "}
          <span className="text-ink-text font-medium">&ldquo;Google hasn&apos;t verified this app&rdquo;</span>. That&apos;s
          expected. To continue:
        </p>
        <ol className="text-sm space-y-1.5 mb-4 list-decimal pl-5">
          <li>
            Click <span className="font-medium">Advanced</span> (bottom left).
          </li>
          <li>
            Click <span className="font-medium">Go to Vyris</span>.
          </li>
          <li>
            Tick the boxes for {what}, then <span className="font-medium">Continue</span>.
          </li>
        </ol>
        <div className="flex gap-2 rounded-lg bg-panel-2 border border-line p-3 text-xs text-muted mb-4">
          <ShieldCheck className="w-4 h-4 text-signal shrink-0" strokeWidth={1.75} />
          <span>
            Vyris reads your mail and calendar to sort and summarize them. It never sends an email or changes anything in
            your account without you approving it first, and you can disconnect any time in your Google account.
          </span>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-sm border border-line">
            Not now
          </button>
          <button
            ref={continueRef}
            onClick={() => {
              track("google_connect_continue");
              connectGoogle(features, returnTo);
            }}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-brass text-white"
          >
            Continue to Google
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
