"use client";

import { track } from "@/lib/analytics";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Brain,
  CalendarClock,
  Clock,
  FolderKanban,
  Inbox,
  Loader2,
  Plug,
  ShieldCheck,
  Split,
  Target,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { VyrisMark } from "@/components/ui/VyrisMark";
import { cn } from "@/lib/utils";
import { AGENTS, AGENT_GROUPS, type AgentGroup } from "@/lib/waitlist-agents";

// ── Motion helpers ─────────────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Fades and lifts its children in the first time they scroll into view. */
function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Waitlist form ──────────────────────────────────────────────────────────

function WaitlistForm({ variant = "light", source }: { variant?: "light" | "dark"; source: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState(""); // honeypot: hidden from people
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dark = variant === "dark";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, website, source }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Couldn't save that. Please try again.");
        setSending(false);
        return;
      }
      try {
        sessionStorage.setItem("vyris.waitlist.name", name.trim().split(" ")[0] ?? "");
      } catch {
        // Private windows can block storage; the success page works without it.
      }
      track("waitlist_join");
      router.push("/waitlist/success");
    } catch {
      setError("Couldn't reach Vyris. Check your connection and try again.");
      setSending(false);
    }
  }

  const field = cn(
    "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2",
    dark
      ? "border-white/25 bg-white/10 text-white placeholder:text-white/60 focus:ring-white/60"
      : "border-line bg-ink text-ink-text placeholder:text-muted focus:ring-brass/40"
  );
  const label = cn("mb-1.5 block text-xs font-medium", dark ? "text-white/80" : "text-muted");
  const id = (f: string) => `wl-${f}-${variant}`;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor={id("name")}>Name</label>
          <input id={id("name")} autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
        </div>
        <div>
          <label className={label} htmlFor={id("company")}>Company <span className="font-normal opacity-70">(optional)</span></label>
          <input id={id("company")} autoComplete="organization" maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your business" className={field} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor={id("email")}>Email</label>
        <input id={id("email")} type="email" inputMode="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbusiness.com" className={field} />
      </div>

      {/* Honeypot: off-screen and skipped by keyboards and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {error && (
        <p role="alert" className={cn("text-sm", dark ? "text-white" : "text-red-600")}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className={cn(
          "group flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-medium transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0",
          dark ? "bg-white text-brass" : "bg-brass text-white"
        )}
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Join the waitlist
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
      </button>
      <p className={cn("text-xs", dark ? "text-white/70" : "text-muted")}>
        We&apos;ll only email you about Vyris access. See our{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}

// ── Animated product preview ───────────────────────────────────────────────

const demoEmails = [
  { from: "Lina Haddad", subject: "Rebrand proposal: need it by Thursday", tag: "Urgent", tone: "bg-red-50 text-red-700" },
  { from: "Omar Farouk", subject: "Invoice #204: payment confirmation?", tag: "Needs reply", tone: "bg-brass-soft text-brass" },
  { from: "Design Weekly", subject: "This week in design: 14 new tools", tag: "Low", tone: "bg-panel-2 text-muted" },
  { from: "Maya Chen", subject: "Quick call tomorrow about the launch?", tag: "Needs reply", tone: "bg-brass-soft text-brass" },
];

/** A looping, made-up inbox: labels land one by one, then a reply draft appears. */
function InboxPreview() {
  const reduced = usePrefersReducedMotion();
  const last = demoEmails.length + 1; // every label, then the draft
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) {
      setStep(last);
      return;
    }
    const id = window.setInterval(() => setStep((s) => (s >= last + 3 ? 0 : s + 1)), 850);
    return () => window.clearInterval(id);
  }, [reduced, last]);

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div aria-hidden="true" className="absolute -inset-6 rounded-[2rem] bg-brass/10 blur-2xl" />
      <div className="relative animate-float-slow rounded-2xl border border-line bg-panel p-5 shadow-2xl" aria-label="Example of Vyris sorting an inbox" role="img">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-brass" strokeWidth={1.75} />
            <span className="font-display text-lg">Inbox</span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
            {step < demoEmails.length ? "Sorting…" : "Sorted"}
          </span>
        </div>
        <ul className="divide-y divide-line">
          {demoEmails.map((e, i) => (
            <li key={e.subject} className="py-3">
              <div className="text-sm font-medium">{e.from}</div>
              <div className="truncate text-xs text-muted">{e.subject}</div>
              <div className="mt-1.5 h-5">
                {step > i && (
                  <span className={cn("inline-block animate-pop-in rounded-full px-2.5 py-0.5 text-[11px] font-medium", e.tone)}>
                    {e.tag}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-2 min-h-[5.5rem]">
          {step >= last && (
            <div className="animate-fade-up rounded-xl bg-panel-2 p-3">
              <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted">Reply drafted</div>
              <p className="text-xs leading-relaxed">
                Hi Lina, absolutely. I&apos;ll send the updated proposal by Wednesday evening so you have a day to review it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Content ────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Inbox,
    title: "An inbox that sorts itself",
    body: "Vyris reads your email first and labels it: urgent, needs reply, work or low. Then it drafts the replies in your tone. Nothing is sent until you approve it.",
  },
  {
    icon: CalendarClock,
    title: "Briefed before every meeting",
    body: "One tap tells you who's coming, what's still open with them and what to raise. It flags double-bookings and blocks focus time on your calendar before meetings fill it.",
  },
  {
    icon: Workflow,
    title: "Follow-ups that chase themselves",
    body: "Set a rule once. When a task gets stuck, Vyris creates the follow-up and flags it. Every morning you get a digest of what's blocked, overdue and due soon.",
  },
  {
    icon: FolderKanban,
    title: "Projects that stay on track",
    body: "Tasks, due dates and blockers in one place, with a clear view of what needs your attention. Paste your meeting notes and get action items with owners.",
  },
  {
    icon: Split,
    title: "Decisions you stop re-arguing",
    body: "Lay out the real options, weigh them, decide and move on. Vyris keeps a record of what you chose and why, and tracks the goals and bets behind it.",
  },
  {
    icon: Brain,
    title: "It remembers your business",
    body: "Tell Vyris once who your clients are, what matters this quarter and how you write. It uses that every time it helps you, and you can see or delete what it remembers.",
  },
];

const benefits: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Clock, title: "Your mornings back", body: "Start the day with a sorted inbox and a digest, not an hour of triage." },
  { icon: Target, title: "Nothing slips", body: "Stuck and overdue work is flagged and followed up without you remembering to chase it." },
  { icon: ShieldCheck, title: "You stay in control", body: "Vyris drafts and suggests. You approve every email and every decision." },
];

const groupIcons: Record<AgentGroup, LucideIcon> = {
  Inbox: Inbox,
  Meetings: CalendarClock,
  Projects: FolderKanban,
  Automation: Workflow,
  Strategy: Split,
};

const steps = [
  { n: "01", title: "Join the waitlist", body: "Leave your name and email. It takes ten seconds." },
  { n: "02", title: "Get your invite", body: "We let people in a few at a time, so each new founder gets real attention and a product that works." },
  { n: "03", title: "Connect and delegate", body: "Sign in, connect Gmail and Calendar if you want to, and hand Vyris the busywork." },
];

const faqs = [
  {
    q: "What is Vyris?",
    a: "An AI chief of staff for people who run a business themselves. It handles your inbox, briefs you before meetings, chases stuck work and keeps your projects and decisions in one place.",
  },
  {
    q: "Who is it for?",
    a: "Solo founders and small teams running online businesses such as e-commerce, agencies and content. If you make the calls and also do the admin, it's built for you.",
  },
  {
    q: "Does Vyris send emails on its own?",
    a: "No. It drafts replies and you approve each one before it goes out. Vyris only reads your Gmail and Calendar after you connect them, and you can disconnect at any time.",
  },
  {
    q: "What happens after I join?",
    a: "You'll get one email when your access is ready. We don't send newsletters or share your address.",
  },
  {
    q: "What will it cost?",
    a: "Pricing isn't final yet. People on the waitlist will hear the price before they're asked to pay anything.",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

/**
 * `showLogin` adds a small "Log in" link for existing users. It is off on the
 * separate waitlist site, which only proxies the waitlist pages.
 */
export function WaitlistPage({ showLogin = false }: { showLogin?: boolean } = {}) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [group, setGroup] = useState<AgentGroup | "All">("All");
  const [source, setSource] = useState<string | null>(null);
  const shownAgents = group === "All" ? AGENTS : AGENTS.filter((a) => a.group === group);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setSource(q.get("utm_source") ?? q.get("ref"));
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-ink-text">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/waitlist" className="group flex items-center gap-3">
            <VyrisMark size="md" className="transition-transform group-hover:scale-105" />
            <span className="font-display text-lg tracking-wide">Vyris</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex" aria-label="Page sections">
            <a href="#features" className="transition-colors hover:text-ink-text">Features</a>
            <a href="#agents" className="transition-colors hover:text-ink-text">Agents</a>
            <a href="#how" className="transition-colors hover:text-ink-text">How it works</a>
            <a href="#about" className="transition-colors hover:text-ink-text">About</a>
            <a href="#faq" className="transition-colors hover:text-ink-text">FAQ</a>
          </nav>
          <a href="#join" className="rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
            Join the waitlist
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="join" className="relative scroll-mt-24">
          <svg aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 animate-orbit-drift text-brass opacity-[0.07]" width="720" height="720" viewBox="0 0 720 720">
            <circle cx="360" cy="360" r="350" fill="none" stroke="currentColor" strokeWidth="1" />
            <circle cx="360" cy="360" r="250" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 10" />
            <circle cx="360" cy="10" r="6" fill="currentColor" />
          </svg>
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-2 lg:pb-28 lg:pt-24">
            <div>
              <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
                </span>
                Early access is opening
              </div>
              <h1 className="animate-fade-up mt-6 font-display text-5xl leading-[1.04] tracking-tight [animation-delay:90ms] sm:text-6xl">
                Every CEO has a chief of staff.
                <span className="mt-2 block italic text-brass">Now you do too.</span>
              </h1>
              <p className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-muted [animation-delay:180ms]">
                Vyris is an AI chief of staff for founders who run the business themselves. It sorts your inbox, briefs
                you before meetings and chases stuck work, so you can get back to the work that matters.
              </p>
              <div className="animate-fade-up mt-8 max-w-xl rounded-2xl border border-line bg-panel p-6 shadow-xl [animation-delay:270ms]">
                <WaitlistForm source={source} />
              </div>
            </div>
            <div className="animate-fade-up [animation-delay:360ms]">
              <InboxPreview />
            </div>
          </div>
        </section>

        {/* Problem strip */}
        <section className="border-y border-line bg-panel">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
            {[
              ["The inbox", "Client emails buried under newsletters, and replies you meant to send."],
              ["The meetings", "Calls you walk into cold, on days with no time left to do the work."],
              ["The follow-ups", "Tasks that stall quietly because nobody is chasing them but you."],
            ].map(([t, b], i) => (
              <Reveal key={t} delay={i * 90}>
                <div className="text-[11px] uppercase tracking-[0.18em] text-brass">{t}</div>
                <p className="mt-2 font-display text-xl leading-snug">{b}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
            <Reveal>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">What Vyris does</div>
              <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                The work around the work, handled.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 90}>
                  <div className="group h-full rounded-2xl border border-line bg-panel p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brass-soft text-brass transition-colors group-hover:bg-brass group-hover:text-white">
                      <f.icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-5 font-display text-xl leading-snug">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-y border-line bg-panel">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-3">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 100}>
                <b.icon className="h-6 w-6 text-brass" strokeWidth={1.75} />
                <h3 className="mt-4 font-display text-2xl">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{b.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Agents */}
        <section id="agents" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
            <Reveal>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Your staff</div>
              <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                {AGENTS.length} agents, <span className="italic text-brass">one chief of staff.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
                Vyris is a team of specialised agents working behind one assistant. Here is what each one does and what
                it needs from you to work.
              </p>
            </Reveal>
            <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter agents by area">
              {(["All", ...AGENT_GROUPS] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  aria-pressed={group === g}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    group === g ? "border-brass bg-brass text-white" : "border-line bg-panel text-muted hover:text-ink-text"
                  )}
                >
                  {g}
                  <span className="ml-1.5 opacity-70">{g === "All" ? AGENTS.length : AGENTS.filter((a) => a.group === g).length}</span>
                </button>
              ))}
            </div>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shownAgents.map((a, i) => {
                const Icon = groupIcons[a.group];
                return (
                  <li
                    key={a.name}
                    style={{ animationDelay: `${Math.min(i, 11) * 40}ms` }}
                    className="group flex animate-fade-up flex-col rounded-2xl border border-line bg-panel p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brass/40 hover:shadow-xl"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brass-soft text-brass transition-colors group-hover:bg-brass group-hover:text-white">
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-muted">{a.group}</span>
                    </div>
                    <h3 className="mt-4 font-display text-lg leading-snug">{a.name}</h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{a.does}</p>
                    <div className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-xs leading-relaxed text-ink-text">
                      <Plug className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass" strokeWidth={1.75} />
                      <span>
                        <span className="font-medium">Needs:</span> {a.needs}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 border-y border-line bg-panel">
          <div className="mx-auto max-w-6xl px-6 py-20 lg:py-24">
            <Reveal>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">How it works</div>
              <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">Three steps to a lighter week.</h2>
            </Reveal>
            <ol className="mt-12 grid gap-10 md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.n}>
                  <Reveal delay={i * 120}>
                    <div className="font-display text-6xl leading-none text-brass/30">{s.n}</div>
                    <h3 className="mt-4 font-display text-2xl">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-5 lg:py-28">
            <Reveal className="lg:col-span-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted">About Vyris</div>
              <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                Built by a founder, <span className="italic text-brass">for founders.</span>
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-5 text-base leading-relaxed text-muted lg:col-span-3">
              <p>
                Large companies give their leaders a chief of staff: someone who reads everything first, prepares every
                meeting and makes sure nothing slips. Founders running a business alone need that help the most and can
                afford it the least.
              </p>
              <p>
                Vyris is being built in Cairo to close that gap. It&apos;s one assistant that knows your projects, your
                clients and your priorities, and does the chasing, briefing and first drafts for you.
              </p>
              <p className="text-ink-text">
                You stay in charge. Vyris drafts and you approve. It suggests and you decide. What it remembers about
                your business is yours to see and delete.
              </p>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 border-t border-line bg-panel">
          <div className="mx-auto max-w-3xl px-6 py-20 lg:py-24">
            <Reveal>
              <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">Questions, answered.</h2>
            </Reveal>
            <div className="mt-10 divide-y divide-line border-y border-line">
              {faqs.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q}>
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      aria-controls={`faq-${i}`}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left"
                    >
                      <span className="font-display text-xl">{f.q}</span>
                      <span className={cn("text-2xl leading-none text-brass transition-transform duration-300", open && "rotate-45")} aria-hidden="true">
                        +
                      </span>
                    </button>
                    <div
                      id={`faq-${i}`}
                      className={cn("grid transition-all duration-300 ease-out motion-reduce:transition-none", open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0")}
                    >
                      <p className="overflow-hidden text-sm leading-relaxed text-muted">{f.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="bg-brass text-white">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center lg:py-24">
            <Reveal>
              <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                Stop running everything yourself.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/80">
                Join the waitlist and be among the first founders to hand the busywork to Vyris.
              </p>
            </Reveal>
            <Reveal delay={120} className="mx-auto mt-8 max-w-xl text-left">
              <WaitlistForm variant="dark" source={source} />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <VyrisMark size="sm" />
            <span>© {new Date().getFullYear()} Vyris. Built in Cairo.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition-colors hover:text-ink-text">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-ink-text">Terms</Link>
            {showLogin && (
              <Link href="/login" className="transition-colors hover:text-ink-text">Log in</Link>
            )}
            <a href="https://www.instagram.com/vyris_app" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink-text">
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
