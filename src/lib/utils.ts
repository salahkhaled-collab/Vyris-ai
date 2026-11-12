import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A redirect target that stays on this site: a relative path like "/inbox".
 * Anything else (absolute URLs, "//evil.com", "/\\evil.com") falls back.
 */
export function safeRedirectPath(target: string | null | undefined, fallback: string): string {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(target)) return fallback;
  return target;
}
