"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Instagram } from "lucide-react";
import { VyrisMark } from "@/components/ui/VyrisMark";

const next = [
  { n: "01", title: "You're saved", body: "Your place on the list is recorded. There's nothing else you need to do." },
  { n: "02", title: "We open in small groups", body: "People are let in a few at a time, so every new founder gets a product that works." },
  { n: "03", title: "One email when it's your turn", body: "You'll get a single message with your access link. No newsletters in between." },
];

/** Shown after joining the waitlist. Greets by first name when the form left one behind. */
export function WaitlistSuccess() {
  const [name, setName] = useState("");
  useEffect(() => {
    try {
      setName((sessionStorage.getItem("vyris.waitlist.name") ?? "").slice(0, 40));
    } catch {
      // Storage can be blocked; the page reads fine without a name.
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-ink-text">
      <svg aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 animate-orbit-drift text-brass opacity-[0.07]" width="720" height="720" viewBox="0 0 720 720">
        <circle cx="360" cy="360" r="350" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="360" cy="360" r="250" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 10" />
        <circle cx="360" cy="10" r="6" fill="currentColor" />
      </svg>

      <header className="relative mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link href="/waitlist" className="group flex items-center gap-3">
          <VyrisMark size="md" className="transition-transform group-hover:scale-105" />
          <span className="font-display text-lg tracking-wide">Vyris</span>
        </Link>
      </header>

      <main className="relative mx-auto max-w-4xl px-6 pb-20 pt-8 sm:pt-16">
        <div className="animate-pop-in flex h-16 w-16 items-center justify-center rounded-full bg-signal text-white shadow-[0_0_0_10px_rgba(47,125,84,0.12)]">
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <h1 className="animate-fade-up mt-8 font-display text-5xl leading-[1.05] tracking-tight [animation-delay:120ms] sm:text-6xl">
          {name ? `You're on the list, ${name}.` : "You're on the list."}
          <span className="mt-2 block italic text-brass">Welcome to Vyris.</span>
        </h1>
        <p className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-muted [animation-delay:220ms]">
          Thanks for joining. We&apos;ll email you as soon as your early access is ready.
        </p>

        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {next.map((s, i) => (
            <li
              key={s.n}
              style={{ animationDelay: `${320 + i * 110}ms` }}
              className="animate-fade-up rounded-2xl border border-line bg-panel p-6"
            >
              <div className="font-display text-4xl leading-none text-brass/30">{s.n}</div>
              <h2 className="mt-4 font-display text-xl">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="animate-fade-up mt-12 flex flex-col gap-3 [animation-delay:700ms] sm:flex-row">
          <a
            href="https://www.instagram.com/vyris_app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-brass px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            <Instagram className="h-4 w-4" strokeWidth={1.75} />
            See Vyris in action on Instagram
          </a>
          <Link
            href="/waitlist"
            className="flex items-center justify-center gap-2 rounded-xl border border-line bg-panel px-6 py-3 text-sm font-medium transition-colors hover:border-brass/40"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Back to the page
          </Link>
        </div>
      </main>
    </div>
  );
}
