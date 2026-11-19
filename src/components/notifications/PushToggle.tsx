"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Share } from "lucide-react";
import { currentEndpoint, disablePush, enablePush, pushSupport, type PushSupport } from "@/lib/push-client";
import { track } from "@/lib/analytics";
import { DEFAULT_PUSH_HOUR, hourLabel } from "@/lib/push";

type State = "loading" | "off" | "on" | "busy";

/**
 * Morning reminder as a phone/browser notification ("Don't forget: 3 things
 * today"), for people who don't want another email. `compact` is the Get
 * Started version: one button. The full version (Settings) adds "Send a test".
 */
export function PushToggle({ compact = false, onEnabled }: { compact?: boolean; onEnabled?: () => void }) {
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [hour, setHour] = useState<number>(DEFAULT_PUSH_HOUR);
  const [timeZone, setTimeZone] = useState<string>("");
  const [hourMsg, setHourMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    const s = pushSupport();
    setSupport(s);
    let active = true;
    Promise.all([
      fetch("/api/push", { cache: "no-store" }).then((r) =>
        r.ok ? (r.json() as Promise<{ publicKey: string | null; devices: { endpoint: string }[]; hour?: number; timeZone?: string }>) : null
      ),
      currentEndpoint().catch(() => null),
    ])
      .then(([data, endpoint]) => {
        if (!active) return;
        setPublicKey(data?.publicKey ?? null);
        if (typeof data?.hour === "number") setHour(data.hour);
        if (data?.timeZone) setTimeZone(data.timeZone);
        setState(endpoint && data?.devices.some((d) => d.endpoint === endpoint) ? "on" : "off");
      })
      .catch(() => active && setState("off"));
    return () => {
      active = false;
    };
  }, []);

  if (support === null || state === "loading") return null;
  if (!publicKey) return compact ? null : <p className="text-sm text-muted">Notifications aren&apos;t available yet.</p>;

  if (support === "ios-needs-home-screen") {
    return (
      <p className="text-xs text-muted flex items-start gap-1.5 w-full sm:max-w-xs">
        <Share className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={1.75} />
        <span>
          On iPhone, first add Vyris to your Home Screen: tap Share, then &ldquo;Add to Home Screen&rdquo;. Open it from
          there and turn notifications on.
        </span>
      </p>
    );
  }
  if (support === "unsupported") {
    return compact ? null : <p className="text-sm text-muted">This browser can&apos;t show notifications. Try Chrome, Edge or Firefox.</p>;
  }

  async function turnOn() {
    setState("busy");
    setMessage(null);
    try {
      await enablePush(publicKey as string);
      track("push_enabled");
      setState("on");
      onEnabled?.();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Couldn't turn on notifications." });
      setState("off");
    }
  }

  async function turnOff() {
    setState("busy");
    setMessage(null);
    await disablePush().catch(() => {});
    setState("off");
  }

  async function saveHour(next: number) {
    const previous = hour;
    setHour(next);
    setHourMsg(null);
    const res = await fetch("/api/push", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hour: next }),
    }).catch(() => null);
    if (res?.ok) {
      setHourMsg({ kind: "ok", text: `Saved. It arrives between ${hourLabel(next)} and ${hourLabel((next + 1) % 24)}${timeZone ? ` (${timeZone.replace(/_/g, " ")} time)` : ""}.` });
    } else {
      setHour(previous);
      setHourMsg({ kind: "error", text: "Couldn't save the time. Try again." });
    }
  }

  async function test() {
    setMessage(null);
    const res = await fetch("/api/push/test", { method: "POST" }).catch(() => null);
    if (res?.ok) setMessage({ kind: "ok", text: "Sent. It should appear in a few seconds." });
    else {
      const data = (await res?.json().catch(() => ({}))) as { message?: string } | undefined;
      setMessage({ kind: "error", text: data?.message ?? "Couldn't send the test." });
    }
  }

  const btn = "text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap";

  if (compact) {
    return (
      <div>
        {state === "on" ? (
          <span className="text-xs text-signal inline-flex items-center gap-1">
            <Bell className="w-3.5 h-3.5" strokeWidth={1.75} /> Notifications on
          </span>
        ) : (
          <button onClick={() => void turnOn()} disabled={state === "busy"} className={`${btn} bg-brass text-white`}>
            {state === "busy" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3.5 h-3.5" strokeWidth={1.75} />}
            Notify me
          </button>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`text-xs mt-1.5 max-w-[16rem] ${message.kind === "error" ? "text-red-600" : "text-signal"}`}>
            {message.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Send it at</span>
        <select
          value={hour}
          onChange={(e) => void saveHour(Number(e.target.value))}
          className="px-3 py-1.5 rounded-lg border border-line bg-panel text-sm"
          aria-label="Time for the morning notification"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {hourLabel(h)}
            </option>
          ))}
        </select>
        {timeZone && <span className="text-xs text-muted">{timeZone.replace(/_/g, " ")} time</span>}
      </label>
      {hourMsg && (
        <p role={hourMsg.kind === "error" ? "alert" : "status"} className={`text-xs ${hourMsg.kind === "error" ? "text-red-600" : "text-signal"}`}>
          {hourMsg.text}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {state === "on" ? (
          <>
            <span className="text-sm inline-flex items-center gap-1.5 mr-2">
              <Bell className="w-4 h-4 text-signal" strokeWidth={1.75} /> On for this device
            </span>
            <button onClick={() => void test()} className={`${btn} border border-line bg-panel-2`}>
              Send a test
            </button>
            <button onClick={() => void turnOff()} className={`${btn} border border-line`}>
              <BellOff className="w-3.5 h-3.5" strokeWidth={1.75} /> Turn off
            </button>
          </>
        ) : (
          <button onClick={() => void turnOn()} disabled={state === "busy"} className={`${btn} bg-brass text-white`}>
            {state === "busy" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3.5 h-3.5" strokeWidth={1.75} />}
            Turn on for this device
          </button>
        )}
      </div>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`text-xs ${message.kind === "error" ? "text-red-600" : "text-signal"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
