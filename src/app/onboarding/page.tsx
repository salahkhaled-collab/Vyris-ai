"use client";

import Link from "next/link";
import { VyrisMark } from "@/components/ui/VyrisMark";

export default function OnboardingWelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <VyrisMark size="lg" className="mx-auto mb-6" />
        <h1 className="font-display text-3xl mb-3">Welcome to vyris</h1>
        <p className="text-sm text-muted leading-relaxed mb-8">
          Before we set up your Command Center, a couple of quick questions
          help vyris tailor itself to how you work.
        </p>
        <Link
          href="/onboarding/role"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium bg-brass text-[#1a140a] w-full"
        >
          Get started
        </Link>
        <Link
          href="/strategy"
          className="block mt-4 text-xs text-muted hover:text-ink-text transition-colors"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
