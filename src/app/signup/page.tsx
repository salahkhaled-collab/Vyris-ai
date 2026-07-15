"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!email || !password || !confirmPassword) {
      setError("Please fill out all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Failed to create an account. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Auto Sign-in with the Credentials Provider
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        // Fallback if auto-login fails: redirect to login
        router.replace("/login?signup_success=true");
      } else {
        router.replace("/onboarding");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-ink text-ink-text">
      <div className="max-w-sm w-full text-center">
        <div className="w-10 h-10 rounded-full border border-brass flex items-center justify-center mx-auto mb-6">
          <div className="w-2.5 h-2.5 rounded-full bg-brass" />
        </div>
        <h1 className="font-display text-3xl mb-2">Create your account</h1>
        <p className="text-sm text-muted mb-8">
          Join Vyris to tailored automate your workflow and calendar.
        </p>

        {error && (
          <div className="text-xs text-[#ff5555] bg-red-950/20 border border-red-500/10 rounded-lg p-3 text-center mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="text-xs text-signal bg-signal/[0.1] border border-signal/20 rounded-lg p-3 text-center mb-4">
            Account created! Signing you in...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-medium text-ink-text mb-1.5" htmlFor="name">
              Full Name (Optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
              className="w-full px-3.5 py-2.5 bg-panel-2 border border-line rounded-lg text-sm text-ink-text placeholder-muted focus:outline-none focus:border-brass transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-text mb-1.5" htmlFor="email">
              Email Address *
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
              Password *
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (Min 8 chars)"
              className="w-full px-3.5 py-2.5 bg-panel-2 border border-line rounded-lg text-sm text-ink-text placeholder-muted focus:outline-none focus:border-brass transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-text mb-1.5" htmlFor="confirm-password">
              Confirm Password *
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-panel-2 border border-line rounded-lg text-sm text-ink-text placeholder-muted focus:outline-none focus:border-brass transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 rounded-lg text-sm font-medium bg-brass text-[#1a140a] hover:opacity-90 transition-opacity flex items-center justify-center"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-line" />
          <span className="px-3 text-xs text-muted font-mono uppercase tracking-wider">or</span>
          <div className="flex-1 border-t border-line" />
        </div>

        {/* OAuth Option */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg text-sm font-medium bg-panel-2 border border-line hover:bg-white/[0.04] transition-colors text-ink-text"
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
          Already have an account?{" "}
          <Link href="/login" className="text-brass hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-[10px] text-muted mt-8 leading-relaxed">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="text-brass hover:underline">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="text-brass hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
