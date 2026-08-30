"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Target, Split, TrendingUp, ArrowRight, Check } from "lucide-react";
import { useUser } from "@/lib/user-context";

function DecisionDemoCard() {
  const [resolved, setResolved] = useState<string | null>(null);

  return (
    <div className="bg-panel border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
          Decision Support
        </div>
        {resolved ? (
          <div className="flex items-center gap-1.5 text-[11px] text-signal">
            <span className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_0_4px_rgba(90,158,122,0.15)]" />
            Resolved
          </div>
        ) : (
          <div className="text-[11px] text-muted">Open</div>
        )}
      </div>
      <h3 className="font-display text-xl mb-4">
        Raise prices before Q4, or hold?
      </h3>
      <div className="space-y-2">
        {["Raise 8% now", "Hold through Q4"].map((option) => (
          <button
            key={option}
            onClick={() => setResolved(option)}
            className={`w-full flex items-center justify-between text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
              resolved === option
                ? "border-brass bg-brass-soft text-ink-text"
                : "border-line bg-panel-2 text-muted hover:text-ink-text"
            }`}
          >
            {option}
            {resolved === option && (
              <Check className="w-4 h-4 text-brass" strokeWidth={2} />
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted mt-4">
        {resolved
          ? "Decision logged — no more re-litigating this in your head next week."
          : "Pick an option to see how a decision gets resolved."}
      </p>
    </div>
  );
}

const features = [
  {
    icon: Target,
    title: "Strategic Planning",
    body: "Set Objectives and Key Results once. Progress is computed automatically from the numbers you're already tracking — never a manual status update you forget to make.",
  },
  {
    icon: Split,
    title: "Decision Support",
    body: "Lay out real options for a real decision, weigh them, resolve it, and move on. A record of what you decided and why, instead of the same debate looping in your head.",
  },
  {
    icon: TrendingUp,
    title: "Strategic Bets",
    body: "Track the handful of bigger bets you're making — on-track, at-risk, or off-track — so a slipping bet gets caught before it quietly becomes a slipping quarter.",
  },
];

const faqs = [
  {
    q: "What does Vyris actually do?",
    a: "Vyris gives solo operators one place to hold their strategic goals (OKRs), the bigger bets they're making, and the decisions they're currently weighing — instead of spreading them across notes apps, spreadsheets, and memory.",
  },
  {
    q: "Who is it built for?",
    a: "Solo operators running online businesses — e-commerce, agency, or content — who are making the strategic calls themselves and need somewhere to think them through, not another team project tracker.",
  },
  {
    q: "Is there a free plan?",
    a: "There's no permanent free tier. Every account starts with a 14-day full-access trial, so you can use the whole product before deciding.",
  },
  {
    q: "What does it cost after the trial?",
    a: "A single plan in the $29–39/month range. We're still validating the exact number directly with early operators rather than treating it as fixed, so the price you're quoted at signup is the price that's locked in for you.",
  },
  {
    q: "How is my account secured?",
    a: "Sign in with Google or email and password. Passwords are hashed before storage, and sessions are handled through encrypted, signed tokens — your credentials are never stored in plain text.",
  },
];

export function LandingPage() {
  const { status } = useSession();
  const { onboarded, loading: profileLoading } = useUser();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (status !== "authenticated" || profileLoading) return;
    router.replace(onboarded ? "/strategy" : "/onboarding");
  }, [status, profileLoading, onboarded, router]);

  if (status === "authenticated") return null;

  return (
    <div className="min-h-screen bg-ink text-ink-text">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-ink/80 border-b border-line">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full border border-brass flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="w-2 h-2 rounded-full bg-brass" />
            </div>
            <span className="font-display text-lg tracking-wide">Vyris</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
            <a href="#product" className="hover:text-ink-text transition-colors">
              Product
            </a>
            <a href="#pricing" className="hover:text-ink-text transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-ink-text transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted hover:text-ink-text transition-colors px-2"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-full text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted mb-4">
            AI Chief of Staff
          </div>
          <h1 className="font-display text-5xl lg:text-6xl leading-[1.05] mb-6">
            Run your business with the clarity of someone who has time to think it through.
          </h1>
          <p className="text-lg text-muted mb-8 max-w-lg">
            Vyris is the strategic operating layer for solo operators — one
            place for your goals, your bigger bets, and the decisions you're
            actually weighing right now.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity"
            >
              Start your 14-day trial
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </Link>
            <a
              href="#product"
              className="text-sm text-muted hover:text-ink-text transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <DecisionDemoCard />
        </div>
      </section>

      {/* Problem framing */}
      <section className="border-y border-line bg-panel/40">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="font-display text-2xl lg:text-3xl leading-snug">
            Running a business alone means the goals, the bets, and the
            open decisions all live in your head — until one of them
            gets dropped.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="product" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted mb-3 text-center">
          What's inside
        </div>
        <h2 className="font-display text-3xl lg:text-4xl text-center mb-14">
          Three things replace a dozen scattered notes.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-panel border border-line rounded-2xl p-7"
            >
              <div className="w-10 h-10 rounded-full bg-brass-soft flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-brass" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-xl mb-3">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line bg-panel/40">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted mb-3">
            Pricing
          </div>
          <h2 className="font-display text-3xl lg:text-4xl mb-6">
            One plan. No tiers to compare.
          </h2>
          <div className="bg-panel border border-line rounded-2xl p-10 max-w-md mx-auto">
            <div className="font-display text-4xl mb-2">$29–39/mo</div>
            <p className="text-sm text-muted mb-6">
              Final price still being validated with early operators —
              whatever you're quoted at signup is locked in for your account.
            </p>
            <ul className="text-sm text-muted text-left space-y-2 mb-8">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-signal shrink-0" strokeWidth={2} />
                14-day full-access trial
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-signal shrink-0" strokeWidth={2} />
                Strategic Planning, Decision Support, Strategic Bets
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-signal shrink-0" strokeWidth={2} />
                No permanent free tier — one plan, kept simple
              </li>
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity w-full justify-center"
            >
              Start your trial
              <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted mb-3 text-center">
          FAQ
        </div>
        <h2 className="font-display text-3xl lg:text-4xl text-center mb-12">
          Common questions
        </h2>
        <div className="space-y-3">
          {faqs.map((item, i) => (
            <div
              key={item.q}
              className="bg-panel border border-line rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="w-full flex items-center justify-between text-left px-6 py-5"
              >
                <span className="font-display text-lg">{item.q}</span>
                <span
                  className={`text-muted transition-transform ${openFaq === i ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
              {openFaq === i && (
                <p className="px-6 pb-5 text-sm text-muted leading-relaxed">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-3xl lg:text-4xl mb-6">
            Stop carrying the whole plan in your head.
          </h2>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity"
          >
            Start your 14-day trial
            <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border border-brass flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-brass" />
            </div>
            <span>&copy; {new Date().getFullYear()} Vyris</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-ink-text transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink-text transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
