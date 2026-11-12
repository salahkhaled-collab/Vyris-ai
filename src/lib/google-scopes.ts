// src/lib/google-scopes.ts
//
// Google access is split in two steps:
//  1. Sign-in asks only for openid/email/profile (non-sensitive scopes, so the
//     OAuth app can be published without Google's sensitive-scope review).
//  2. Gmail and Calendar are requested later, only when the user clicks a
//     Connect button for that feature (incremental authorization).
//
// Client-safe: no server imports.

export const BASE_GOOGLE_SCOPES = ["openid", "email", "profile"] as const;

export const GOOGLE_FEATURE_SCOPES = {
  gmail: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"],
  calendar: ["https://www.googleapis.com/auth/calendar"],
} as const;

export type GoogleFeature = keyof typeof GOOGLE_FEATURE_SCOPES;

/**
 * What each server action actually needs. Connect asks for the whole feature,
 * but reading mail must keep working if the user unticked "send" on Google's
 * screen; only sending needs the send scope.
 */
export const REQUIRED_SCOPES = {
  gmail: ["https://www.googleapis.com/auth/gmail.readonly"],
  gmail_send: ["https://www.googleapis.com/auth/gmail.send"],
  calendar: ["https://www.googleapis.com/auth/calendar"],
} as const;

export type GoogleNeed = keyof typeof REQUIRED_SCOPES;

/** Whether a stored, space-separated scope string covers what an action needs. */
export function hasFeatureScopes(granted: string | null | undefined, need: GoogleNeed): boolean {
  const set = new Set((granted ?? "").split(/\s+/).filter(Boolean));
  return REQUIRED_SCOPES[need].every((s) => set.has(s));
}

/** Whether the scopes in `next` include every scope in `previous`. */
export function coversScopes(next: string | null | undefined, previous: string | null | undefined): boolean {
  const have = new Set((next ?? "").split(/\s+/).filter(Boolean));
  return (previous ?? "").split(/\s+/).filter(Boolean).every((s) => have.has(s));
}

/** Whether a scope string includes any Gmail or Calendar scope. */
export function hasAnyFeatureScope(granted: string | null | undefined): boolean {
  const set = new Set((granted ?? "").split(/\s+/).filter(Boolean));
  return Object.values(GOOGLE_FEATURE_SCOPES).some((scopes) => scopes.some((s) => set.has(s)));
}

/**
 * Whether a new Google grant should replace the stored one. Only a plain
 * sign-in (profile scopes only) is kept from overwriting a stored Gmail or
 * Calendar grant. A Connect click always carries a feature scope, so it always
 * wins, even when it grants fewer scopes than before: the stored grant may be
 * dead (expired or revoked), and keeping it would block reconnecting forever.
 */
export function shouldReplaceGrant(stored: string | null | undefined, incoming: string | null | undefined): boolean {
  return hasAnyFeatureScope(incoming) || !hasAnyFeatureScope(stored);
}

/**
 * Authorization params for the Connect buttons. include_granted_scopes keeps
 * whatever the user granted before (connecting Calendar does not drop Gmail);
 * offline + consent makes Google return a refresh token for background use.
 */
export function connectParams(feature: GoogleFeature): Record<string, string> {
  return {
    scope: [...BASE_GOOGLE_SCOPES, ...GOOGLE_FEATURE_SCOPES[feature]].join(" "),
    include_granted_scopes: "true",
    access_type: "offline",
    prompt: "consent",
  };
}
