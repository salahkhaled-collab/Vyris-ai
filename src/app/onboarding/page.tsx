"use client";

import Link from "next/link";
import { VyrisMark } from "@/components/ui/VyrisMark";

export default function OnboardingWelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <VyrisMark size="lg" className="mx-auto mb-6" />
        <h1 className="font-display text-3xl mb-3">Welcome to Vyris</h1>
        <p className="text-sm text-muted leading-relaxed mb-8">
          One quick question so Vyris fits how you work: just you, or you and
          a team. Then you&apos;ll connect your inbox and calendar.
        </p>
        <Link
          href="/onboarding/workspace"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium bg-brass text-white w-full"
        >
          Get started
        </Link>
        <Link
          href="/dashboard"
          className="block mt-4 text-xs text-muted hover:text-ink-text transition-colors"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
