import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink text-ink-text flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted mb-3">
          Error 404
        </div>
        <h1 className="font-display text-4xl mb-4">
          This page isn&apos;t on the map.
        </h1>
        <p className="text-muted mb-8">
          The link may be outdated, or the page may have moved. Check the
          address, or head back to somewhere that exists.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            Back to home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-panel-2 text-ink-text hover:text-brass transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
