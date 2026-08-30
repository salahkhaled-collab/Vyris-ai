import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service governing the use of the Vyris platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ink text-ink-text">
      {/* Premium Header */}
      <header className="max-w-4xl mx-auto pt-12 pb-6 px-6 flex items-center justify-between border-b border-line">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full border border-brass flex items-center justify-center transition-transform group-hover:scale-105">
            <div className="w-2 h-2 rounded-full bg-brass" />
          </div>
          <span className="font-display text-lg tracking-wide text-ink-text group-hover:text-brass transition-colors">
            Vyris
          </span>
        </Link>
        <Link
          href="/login"
          className="text-xs font-mono text-muted hover:text-brass transition-colors"
        >
          &larr; Return to Login
        </Link>
      </header>

      {/* Main Terms of Service Container */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-panel border border-line rounded-2xl p-8 lg:p-12 relative overflow-hidden shadow-xl">
          {/* Decorative drift orbit background element */}
          <svg
            className="absolute -right-24 -top-24 opacity-[0.04] animate-orbit-drift pointer-events-none"
            width="320"
            height="320"
            viewBox="0 0 320 320"
          >
            <circle cx="160" cy="160" r="150" fill="none" stroke="currentColor" strokeWidth="1" className="text-brass" />
            <circle cx="160" cy="160" r="110" fill="none" stroke="currentColor" strokeWidth="1" className="text-brass" />
            <circle cx="160" cy="10" r="5" fill="currentColor" className="text-brass" />
          </svg>

          <h1 className="font-display text-4xl mb-2 text-ink-text">Terms of Service</h1>
          <p className="text-muted text-xs font-mono mb-10">
            Last updated: July 15, 2026
          </p>

          <div className="text-sm leading-relaxed text-[#c5c5d2] space-y-6">
            <p>
              These terms govern your use of Vyris, an AI-powered chief of staff
              application, at{" "}
              <a href="https://vyris.app" className="text-brass hover:underline">
                https://vyris.app
              </a>. By creating an account, you agree to these terms.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              1. The service
            </h2>
            <p>
              Vyris provides project tracking, calendar and (where connected)
              inbox visibility, team collaboration, and AI-assisted planning and
              drafting features. The service is provided &quot;as is&quot; &mdash; see Section 5.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              2. Your account
            </h2>
            <p>
              You&apos;re responsible for keeping your account credentials secure and
              for all activity under your account. You must provide accurate
              information when creating an account and keep it up to date.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              3. Acceptable use
            </h2>
            <p>You agree not to:</p>
            <ul className="space-y-3 pl-4 border-l border-brass-soft">
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                Use Vyris for any unlawful purpose.
              </li>
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                Attempt to gain unauthorized access to other users&apos; accounts or data.
              </li>
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                Reverse engineer, scrape, or abuse the service in ways not intended by normal use.
              </li>
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                Use Vyris to process another person&apos;s Google data without their authorization.
              </li>
            </ul>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              4. Subscription and billing
            </h2>
            <p>
              Vyris is currently offered free of charge during its beta period.
              We will provide notice before introducing paid plans.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              5. Disclaimer of warranties
            </h2>
            <p>
              Vyris is provided &quot;as is&quot; without warranties of any kind, express or
              implied. AI-generated content (drafts, summaries, recommendations)
              may contain errors &mdash; you are responsible for reviewing anything
              before acting on it or sending it externally.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              6. Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law, Vyris and its operators are
              not liable for indirect, incidental, or consequential damages
              arising from your use of the service.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              7. Termination
            </h2>
            <p>
              You may delete your account at any time. We may suspend or terminate
              accounts that violate these terms.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              8. Governing law
            </h2>
            <p>
              These terms of service shall be governed by and construed in accordance with
              the laws of the State of Delaware, United States, without regard to its conflict
              of law principles, applicable globally.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              9. Changes to these terms
            </h2>
            <p>
              We may update these terms from time to time. Continued use of Vyris
              after changes means you accept the updated terms.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              10. Contact
            </h2>
            <p>
              Questions about these terms:{" "}
              <a href="mailto:support@vyris.app" className="text-brass hover:underline">
                support@vyris.app
              </a>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
