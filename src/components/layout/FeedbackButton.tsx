"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Check, Loader2, MessageSquareHeart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_MESSAGE, MOODS, MOOD_LABELS, type Mood } from "@/lib/feedback";

const MOOD_EMOJI: Record<Mood, string> = { bad: "😕", ok: "🙂", great: "🤩" };

/**
 * "Send feedback": a short note to the founder, with how useful Vyris feels
 * and the page it was sent from. `className` styles the trigger to match
 * where it sits (sidebar footer or the mobile menu).
 */
export function FeedbackButton({ className, onOpen }: { className?: string; onOpen?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<Mood | null>(null);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    textRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function show() {
    onOpen?.();
    setState("idle");
    setError(null);
    setOpen(true);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mood, page: pathname }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Couldn't send. Try again.");
      setState("sent");
      setMessage("");
      setMood(null);
      setTimeout(() => setOpen(false), 1600);
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Couldn't send. Try again.");
    }
  }

  return (
    <>
      <button type="button" onClick={show} className={className}>
        <MessageSquareHeart className="w-4 h-4" strokeWidth={1.75} />
        Send feedback
      </button>
      {/* Portal to <body>: inside the sidebar or the mobile menu the dialog would be
          trapped in their layer, under the floating "Ask Vyris" button. */}
      {open &&
        createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/30 p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Send feedback"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-line bg-panel p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="font-display text-xl">How&apos;s Vyris working for you?</h2>
                <p className="text-xs text-muted mt-0.5">This goes straight to the founder. Honest is best.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded hover:bg-black/[0.06]">
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>
            {state === "sent" ? (
              <p className="flex items-center gap-2 text-sm py-6 justify-center">
                <Check className="w-4 h-4 text-signal" /> Thank you. Salah reads every one.
              </p>
            ) : (
              <form onSubmit={(e) => void send(e)} className="space-y-3">
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="How useful is Vyris">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mood === m}
                      onClick={() => setMood(mood === m ? null : m)}
                      className={cn(
                        "rounded-lg border px-2 py-2.5 text-xs flex flex-col items-center gap-1",
                        mood === m ? "border-brass bg-brass-soft text-brass font-medium" : "border-line"
                      )}
                    >
                      <span className="text-lg" aria-hidden>
                        {MOOD_EMOJI[m]}
                      </span>
                      {MOOD_LABELS[m]}
                    </button>
                  ))}
                </div>
                <textarea
                  ref={textRef}
                  dir="auto"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MAX_MESSAGE}
                  rows={4}
                  placeholder="What's useful, what's annoying, what's missing? Arabic or English."
                  aria-label="Your feedback"
                  className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-brass"
                />
                {error && (
                  <p role="alert" className="text-xs text-red-600">
                    {error}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={state === "sending" || (!message.trim() && !mood)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brass text-white disabled:opacity-50"
                  >
                    {state === "sending" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Send
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
