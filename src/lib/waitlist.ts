// src/lib/waitlist.ts
//
// Validation for the public waitlist form. Pure and client-safe.

export const BUSINESS_TYPES = ["ecommerce", "agency", "content", "other"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_LABELS: Record<BusinessType, string> = {
  ecommerce: "E-commerce",
  agency: "Agency or freelance",
  content: "Content or creator",
  other: "Something else",
};

const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/;

export interface WaitlistInput {
  email: string;
  name: string | null;
  businessType: BusinessType | null;
  source: string | null;
}

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim().slice(0, max);
  return t.length > 0 ? t : null;
};

/**
 * Returns the cleaned entry, an error message, or "bot" when the hidden
 * honeypot field was filled in (real people never see that field).
 */
export function parseWaitlistInput(body: unknown): WaitlistInput | { error: string } | "bot" {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (typeof b.website === "string" && b.website.trim().length > 0) return "bot";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (email.length === 0) return { error: "Enter your email address." };
  if (email.length > 254 || !EMAIL_RE.test(email)) return { error: "That email address doesn't look right." };
  const businessType = (BUSINESS_TYPES as readonly string[]).includes(String(b.businessType))
    ? (b.businessType as BusinessType)
    : null;
  const source = text(b.source, 60);
  return {
    email,
    name: text(b.name, 80),
    businessType,
    source: source && /^[\w .-]+$/.test(source) ? source : null,
  };
}
