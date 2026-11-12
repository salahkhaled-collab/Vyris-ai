// Funnel events for GA4. No-ops when analytics isn't loaded or the visitor
// hasn't accepted analytics cookies (Consent Mode keeps GA from storing them).
// Never send personal data (names, emails) as event parameters.

export const CONSENT_KEY = "vyris-cookie-consent";

type Gtag = (...args: unknown[]) => void;

function gtag(): Gtag | null {
  if (typeof window === "undefined") return null;
  const g = (window as unknown as { gtag?: Gtag }).gtag;
  return typeof g === "function" ? g : null;
}

export type FunnelEvent =
  | "waitlist_join"
  | "sign_up"
  | "onboarding_complete"
  | "connect_gmail_click"
  | "connect_calendar_click"
  | "digest_enabled"
  | "ai_rate_limited";

export function track(event: FunnelEvent, params: Record<string, string | number> = {}): void {
  gtag()?.("event", event, params);
}

/** Tell GA the visitor's cookie choice (called by the consent banner). */
export function updateConsent(accepted: boolean): void {
  gtag()?.("consent", "update", { analytics_storage: accepted ? "granted" : "denied" });
}
