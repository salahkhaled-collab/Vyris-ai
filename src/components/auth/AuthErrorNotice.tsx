"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email already has a Vyris account. Sign in with your email and password, then connect Google from the Calendar page.",
  AccessDenied: "Google didn't allow this sign-in.",
  Configuration: "Sign-in isn't configured correctly on the server.",
  OAuthCallback: "Google sign-in failed on the way back to Vyris. Please try again.",
  OAuthSignin: "Could not start Google sign-in. Please try again.",
  Callback: "Sign-in failed. Please try again.",
  SessionRequired: "Please sign in to continue.",
  CredentialsSignin: "Invalid email or password.",
};

export function AuthErrorNotice() {
  const code = useSearchParams().get("error");
  if (!code) return null;
  return (
    <div className="text-xs text-[#ff5555] bg-red-950/20 border border-red-500/10 rounded-lg p-3 text-center mb-4">
      {MESSAGES[code] ?? "Sign-in failed."} ({code})
    </div>
  );
}