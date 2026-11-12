import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getGoogleAccessToken } from "@/lib/google-token";
import { buildRawMessage, parseRecipient } from "@/lib/gmail";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Sign in with Google to send email." },
      { status: 401 }
    );
  }

  const { accessToken, error } = await getGoogleAccessToken(session.user.id, "gmail");

  if (!accessToken) {
    const message =
      error === "no_refresh_token" || error === "refresh_failed"
        ? "Your Google connection expired. Click Connect to reconnect."
        : "Connect Gmail to send email.";
    return NextResponse.json({ error: error ?? "not_authenticated", message }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  const { to, subject, message, threadId, inReplyTo } = (body ?? {}) as Record<string, unknown>;

  if (typeof to !== "string" || typeof subject !== "string" || typeof message !== "string" || !subject.trim() || !message.trim()) {
    return NextResponse.json(
      { error: "invalid_input", message: "To, subject, and message are required." },
      { status: 400 }
    );
  }
  const recipient = parseRecipient(to);
  if (!recipient) {
    return NextResponse.json({ error: "invalid_recipient", message: "That email address doesn't look right." }, { status: 400 });
  }

  // Header values are sanitised inside buildRawMessage (no line breaks can reach the headers).
  const raw = buildRawMessage({
    to: recipient,
    subject,
    body: message,
    inReplyTo: typeof inReplyTo === "string" ? inReplyTo : null,
  });
  const thread = typeof threadId === "string" && /^[A-Za-z0-9]+$/.test(threadId) ? threadId : undefined;

  try {
    const res = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        // threadId keeps a reply in the same Gmail conversation.
        body: JSON.stringify(thread ? { raw, threadId: thread } : { raw }),
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