import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Vyris Privacy Policy and data handling disclosures.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
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

      {/* Main Privacy Policy Container */}
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

          <h1 className="font-display text-4xl mb-2 text-ink-text">Privacy Policy</h1>
          <p className="text-muted text-xs font-mono mb-10">
            Last updated: July 15, 2026
          </p>

          <div className="text-sm leading-relaxed text-[#c5c5d2] space-y-6">
            <p>
              Vyris (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) provides an AI-powered chief of staff
              application. This policy explains what data we collect, why, and how
              it&apos;s handled. It applies to the Vyris web application at{" "}
              <a href="https://vyris.app" className="text-brass hover:underline">
                https://vyris.app
              </a>.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              1. Information we collect
            </h2>

            <div className="space-y-4">
              <h3 className="font-medium text-base text-ink-text mt-6">Account information</h3>
              <p>
                When you create an account, we collect your name, email address, and
                (if you sign up with email/password) a securely hashed password. We
                never store your password in plain text.
              </p>

              <h3 className="font-medium text-base text-ink-text mt-6">Google account data</h3>
              <p>
                If you connect Vyris to your Google account, we request the following
                scopes:
              </p>
              <ul className="space-y-3 pl-4 border-l border-brass-soft">
                <li className="relative pl-5">
                  <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                  <strong className="text-ink-text">Profile and email</strong> &mdash; to create and identify your account.
                </li>
                <li className="relative pl-5">
                  <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                  <strong className="text-ink-text">Google Calendar (read-only)</strong> &mdash; to display your
                  schedule inside Vyris&apos;s Command Center. Google Calendar events are fetched
                  live from Google&apos;s API on each request and are not cached or stored in our database.
                </li>
                <li className="relative pl-5">
                  <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                  <strong className="text-ink-text">Gmail (read-only)</strong> &mdash; to display your inbox inside
                  Vyris. Per our current architecture, Gmail messages are fetched
                  live from Google&apos;s API on each request and are not stored in our
                  database.
                </li>
              </ul>
              <p className="mt-4">
                We store the OAuth access and refresh tokens associated with your
                Google connection so we can maintain access without asking you to
                sign in repeatedly. These tokens are stored in our database and are
                never shared with third parties.
              </p>

              <h3 className="font-medium text-base text-ink-text mt-6">Content you create</h3>
              <p>
                Projects, tasks, contacts, documents, and team messages you create
                within Vyris are stored in our database for as long as your account
                remains active.
              </p>
            </div>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              2. How we use your information
            </h2>
            <ul className="space-y-3 pl-4 border-l border-brass-soft">
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                To provide and operate the Vyris application.
              </li>
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                To populate your Command Center with your real calendar and inbox data.
              </li>
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                To authenticate you and maintain your session.
              </li>
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                To communicate with you about your account, if necessary.
              </li>
            </ul>
            <p className="mt-4">
              We do not sell your data. We do not use your Google data to train AI
              models, and we do not share it with third parties except as required
              to operate the service (e.g., our database and hosting providers) or
              to process AI tasks. Specifically, we send user-submitted prompts to
              Anthropic&apos;s API for AI completion services; this content is not used by
              Anthropic to train public models.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              3. Data storage and security
            </h2>
            <p>
              Your data is stored on Neon PostgreSQL with industry-standard encryption in
              transit. Passwords are hashed before storage and are never
              recoverable by us in plain text.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              4. Your rights and choices
            </h2>
            <ul className="space-y-3 pl-4 border-l border-brass-soft">
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                You can revoke Vyris&apos;s access to your Google account at any time
                from your{" "}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-brass hover:underline">
                  Google Account permissions page
                </a>.
              </li>
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                You can request deletion of your Vyris account and associated data by contacting us at{" "}
                <a href="mailto:support@vyris.app" className="text-brass hover:underline">
                  support@vyris.app
                </a>.
              </li>
              <li className="relative pl-5">
                <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-brass" />
                You can export or review your data by contacting us at the same address.
              </li>
            </ul>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              5. Children&apos;s privacy
            </h2>
            <p>
              Vyris is not directed at, and does not knowingly collect data from,
              anyone under 18.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              6. Changes to this policy
            </h2>
            <p>
              We&apos;ll update this page if our data practices change and update the
              &quot;Last updated&quot; date above. Material changes affecting Google user
              data will be reflected here before they take effect.
            </p>

            <h2 className="font-display text-2xl text-ink-text mt-12 mb-4 border-b border-line pb-2">
              7. Contact
            </h2>
            <p>
              Questions about this policy:{" "}
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
