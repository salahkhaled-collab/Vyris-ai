import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getGoogleAccessToken } from "@/lib/google-token";
import { GmailError, listInbox } from "@/lib/gmail";

const MAX_RESULTS = 15;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Sign in with Google to load your inbox." },
      { status: 401 }
    );
  }

  const { accessToken, error } = await getGoogleAccessToken(session.user.id);
  if (!accessToken) {
    const message =
      error === "no_refresh_token" || error === "refresh_failed"
        ? "Your Google session expired. Please sign in again."
        : "Connect Gmail to see your inbox.";
    return NextResponse.json({ error: error ?? "not_authenticated", message }, { status: 401 });
  }

  try {
    return NextResponse.json({ messages: await listInbox(accessToken, MAX_RESULTS) });
  } catch (err: unknown) {
    console.error("Failed to fetch Gmail messages:", err);
    const status = err instanceof GmailError ? 502 : 500;
    return NextResponse.json({ error: "gmail_api_error", message: "Could not load your inbox." }, { status });
  }
}
