"use client";

import { signIn } from "next-auth/react";
import { connectParams, type GoogleFeature } from "@/lib/google-scopes";

/**
 * Ask Google for Gmail or Calendar access, then come back to the current page.
 * If the user is already signed in, NextAuth links the Google account to them.
 */
export function connectGoogle(feature: GoogleFeature): void {
  const callbackUrl = typeof window !== "undefined" ? window.location.href : "/";
  void signIn("google", { callbackUrl }, connectParams(feature));
}
