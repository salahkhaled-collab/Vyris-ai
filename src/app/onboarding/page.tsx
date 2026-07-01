"use client";

import Link from "next/link";

export default function OnboardingWelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-10 h-10 rounded-full border border-brass flex items-center justify-center mx-auto mb-6">
          <div className="w-2.5 h-2.5 rounded-full bg-brass" />
        </div>
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
          href="/dashboard"
          className="block mt-4 text-xs text-muted hover:text-ink-text transition-colors"
        >
          Skip for now
        </Link>
      </div>
    </div>
  );
}
