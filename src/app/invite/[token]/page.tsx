"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { status } = useSession();
  const [state, setState] = useState<"idle" | "accepting" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);

  async function accept() {
    setState("accepting");
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setMessage(data.message ?? "Could not accept this invite.");
        return;
      }
      setTeamName(data.teamName);
      setState("success");
      setTimeout(() => router.push("/strategy"), 1500);
    } catch {
      setState("error");
      setMessage("Something went wrong. Try again.");
    }
  }

  useEffect(() => {
    // Auto-accept once signed in, so the flow is one click from the email.
    if (status === "authenticated" && state === "idle") {
      accept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-10 h-10 rounded-full border border-brass flex items-center justify-center mx-auto mb-6">
          <div className="w-2.5 h-2.5 rounded-full bg-brass" />
        </div>

        {status === "loading" && <p className="text-sm text-muted">Loading...</p>}

        {status === "unauthenticated" && (
          <>
            <h1 className="font-display text-2xl mb-2">You&apos;ve been invited to Vyris</h1>
            <p className="text-sm text-muted mb-8">
              Sign in with Google to accept and join the team.
            </p>
            <button
              onClick={() => signIn("google", { callbackUrl: `/invite/${params.token}` })}
              className="w-full px-6 py-3 rounded-lg text-sm font-medium bg-brass text-[#1a140a]"
            >
              Continue with Google
            </button>
          </>
        )}

        {status === "authenticated" && state === "accepting" && (
          <p className="text-sm text-muted">Joining the team...</p>
        )}

        {status === "authenticated" && state === "success" && (
          <>
            <h1 className="font-display text-2xl mb-2">Welcome to {teamName}</h1>
            <p className="text-sm text-muted">Taking you to your Command Center...</p>
          </>
        )}

        {status === "authenticated" && state === "error" && (
          <>
            <h1 className="font-display text-2xl mb-2">Couldn&apos;t join</h1>
            <p className="text-sm text-muted mb-6">{message}</p>
            <button
              onClick={() => router.push("/strategy")}
              className="w-full px-6 py-3 rounded-lg text-sm font-medium bg-panel-2"
            >
              Go to Command Center
            </button>
          </>
        )}
      </div>
    </div>
  );
}
