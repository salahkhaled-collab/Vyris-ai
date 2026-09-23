import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getGoogleAccessToken } from "@/lib/google-token";

function buildRawMessage(to: string, subject: string, body: string): string {
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Sign in with Google to send email." },
      { status: 401 }
    );
  }

  const { accessToken, error } = await getGoogleAccessToken(session.user.id);

  if (!accessToken) {
    const message =
      error === "no_refresh_token" || error === "refresh_failed"
        ? "Your Google session expired. Please sign in again."
        : "Connect Gmail to send email.";
    return NextResponse.json({ error: error ?? "not_authenticated", message }, { status: 401 });
  }

  const body = await req.json();
  const { to, subject, message } = body;

  if (!to || !subject || !message) {
    return NextResponse.json(
      { error: "invalid_input", message: "To, subject, and message are required." },
      { status: 400 }
    );
  }

  const raw = buildRawMessage(to, subject, message);

  try {
    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Gmail send error:", res.status, errBody);

      if (res.status === 403) {
        return NextResponse.json(
          { error: "insufficient_scope", message: "Reconnect Gmail to enable sending." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "gmail_api_error", message: "Could not send the email." },
        { status: 502 }
      );
    }

    const sent = await res.json();
    return NextResponse.json({ message: sent });
  } catch (err) {
    console.error("Failed to send email:", err);
    return NextResponse.json(
      { error: "send_failed", message: "Could not reach Gmail." },
      { status: 500 }
    );
  }
}