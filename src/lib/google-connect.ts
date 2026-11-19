"use client";

import { signIn } from "next-auth/react";
import { connectParams, type GoogleFeature } from "@/lib/google-scopes";

/**
 * Ask Google for Gmail and/or Calendar access (one screen for several), then
 * come back to `returnTo` (an app path) or the current page. If the user is
 * already signed in, NextAuth links the Google account to them.
 */
export function connectGoogle(feature: GoogleFeature | GoogleFeature[], returnTo?: string): void {
  const here = typeof window !== "undefined" ? window.location.href : "/";
  const callbackUrl = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : here;
  void signIn("google", { callbackUrl }, connectParams(feature));
}
