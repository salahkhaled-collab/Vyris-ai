"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { VyrisMark } from "@/components/ui/VyrisMark";

function LoginContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
 const callbackUrl = searchParams.get("callbackUrl") || "/strategy";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  useEffect(() => {
    if (searchParams.get("signup_success") === "true") {
      setSignupSuccess(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setSignupSuccess(false);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password.");
      } else {
        router.replace(callbackUrl);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-ink text-ink-text">
      <div className="max-w-sm w-full text-center">
        <VyrisMark size="lg" className="mx-auto mb-6" />
        <h1 className="font-display text-3xl mb-2">Welcome to Vyris</h1>
        <p className="text-sm text-muted mb-8">
          Sign in to access your Command Center, calendar, and AI Chief of Staff.
        </p>

        {error && (
          <div className="text-xs text-[#ff5555] bg-red-950/20 border border-red-500/10 rounded-lg p-3 text-center mb-4">
            {error}
          </div>
        )}

        {signupSuccess && (
          <div className="text-xs text-signal bg-signal/[0.1] border border-signal/20 rounded-lg p-3 text-center mb-4">
            Account created successfully! Please sign in below.
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-medium text-ink-text mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 bg-panel-2 border border-line rounded-lg text-sm text-ink-text placeholder-muted focus:outline-none focus:border-brass transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-text mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-panel-2 border border-line rounded-lg text-sm text-ink-text placeholder-muted focus:outline-none focus:border-brass transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium bg-brass text-white hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-line" />
          <span className="px-3 text-xs text-muted font-mono uppercase tracking-wider">or</span>
          <div className="flex-1 border-t border-line" />
        </div>

        {/* OAuth Button */}
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg text-sm font-medium bg-panel-2 border border-line hover:bg-black/[0.05] transition-colors text-ink-text"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
            />
            <path
              fill="currentColor"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A8.997 8.997 0 0 0 9 18z"
            />
            <path
              fill="currentColor"
              d="M3.95 10.71A5.41 5.41 0 0 1 3.66 9c0-.59.1-1.17.29-1.71V4.96H.96A8.997 8.997 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33z"
            />
            <path
              fill="currentColor"
              d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.997 8.997 0 0 0 9 0 8.997 8.997 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-muted mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-brass hover:underline">
            Create an account
          </Link>
        </p>

        <p className="text-[11px] text-muted mt-6 leading-relaxed">
          Vyris requests read-only calendar access to populate your Command Center.
          You can revoke access at any time from your Google account settings.{" "}
          Read our <Link href="/privacy" className="text-brass hover:underline">Privacy Policy</Link> and{" "}
          <Link href="/terms" className="text-brass hover:underline">Terms of Service</Link>.
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
