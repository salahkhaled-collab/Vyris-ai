// src/lib/site-url.ts
//
// The app's own public address. Used for metadata (canonical, Open Graph,
// sitemap) and for links that must reach the app even when a page is served
// through the waitlist proxy (vyris-waitlist.vercel.app forwards only a few
// paths, so a relative "/login" there is a 404).
//
// Order: NEXT_PUBLIC_SITE_URL (set this once a custom domain exists), then
// NEXTAUTH_URL, then Vercel's production domain, then local dev.

function clean(url: string): string {
  return url.replace(/\/+$/, "");
}

export const SITE_URL = clean(
  process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3002"
);
