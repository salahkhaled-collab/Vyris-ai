"use client";

import { useEffect } from "react";

const KEY = "vyris.activity.day";

/**
 * Tells the server once a day that this user opened the app, for active-user
 * and retention numbers. Sends nothing but the request itself.
 */
export function ActivityPing() {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      if (window.localStorage.getItem(KEY) === today) return;
    } catch {
      // storage unavailable: ping anyway; the server ignores repeats
    }
    fetch("/api/activity", { method: "POST" })
      .then((r) => {
        if (!r.ok) return;
        try {
          window.localStorage.setItem(KEY, today);
        } catch {
          // ignore
        }
      })
      .catch(() => {});
  }, []);
  return null;
}
