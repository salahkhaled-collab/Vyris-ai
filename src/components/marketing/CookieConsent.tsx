"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "vyris-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage unavailable (e.g. private browsing) — skip silently
    }
  }, []);

  function choose(value: "accepted" | "declined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-sm z-50 bg-panel border border-line rounded-2xl p-5 shadow-xl"
    >
      <p className="text-sm text-ink-text mb-4">
        Vyris uses essential cookies to keep you signed in, and optional
        analytics cookies to understand how the product is used. Read our{" "}
        <Link href="/privacy" className="text-brass hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => choose("accepted")}
          className="px-4 py-2 rounded-full text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity"
        >
          Accept
        </button>
        <button
          onClick={() => choose("declined")}
          className="px-4 py-2 rounded-full text-sm font-medium bg-panel-2 text-ink-text hover:text-brass transition-colors"
        >
          Essential only
        </button>
      </div>
    </div>
  );
}
