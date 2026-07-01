"use client";

import { Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-10 h-10 rounded-full border border-brass flex items-center justify-center mx-auto mb-6">
          <div className="w-2.5 h-2.5 rounded-full bg-brass" />
        </div>
        <h1 className="font-display text-3xl mb-2">Vyris</h1>
        <p className="text-sm text-muted mb-8">
          Sign in to access your Command Center, calendar, and AI Chief of Staff.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg text-sm font-medium bg-brass text-[#1a140a]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="#1a140a"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
            />
            <path
              fill="#1a140a"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A8.997 8.997 0 0 0 9 18z"
            />
            <path
              fill="#1a140a"
              d="M3.95 10.71A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.17.29-1.71V4.96H.96A8.997 8.997 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z"
            />
            <path
              fill="#1a140a"
              d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.997 8.997 0 0 0 9 0 8.997 8.997 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-[11px] text-muted mt-6 leading-relaxed">
          Vyris requests read-only calendar access to populate your Command Center.
          You can revoke access at any time from your Google account settings.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
