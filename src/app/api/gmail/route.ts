import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getGoogleAccessToken } from "@/lib/google-token";

const MAX_RESULTS = 15;

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessageMeta {
  id: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: {
    headers?: GmailHeader[];
  };
}

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Extracts a display name from a "Name <email>" From header. */
function parseFromName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : from.split("<")[0].trim() || from;
}

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

  const authHeader = { Authorization: `Bearer ${accessToken}` };

  try {
    // Step 1: list recent message IDs from the inbox
    const listParams = new URLSearchParams({
      maxResults: String(MAX_RESULTS),
      labelIds: "INBOX",
      q: "in:inbox", // excludes spam/trash by default, but explicit for clarity
    });

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${listParams.toString()}`,
      { headers: authHeader, cache: "no-store" }
    );

    if (!listRes.ok) {
      const body = await listRes.text();
      console.error("Gmail list error:", listRes.status, body);
      return NextResponse.json(
        { error: "gmail_api_error", message: "Could not load your inbox." },
        { status: 502 }
      );
    }

    const listData = await listRes.json();
    const ids: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id);

    if (ids.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    // Step 2: fetch metadata (headers + snippet only — never the full body)
    // in parallel for each message.
    const metaParams = new URLSearchParams({
      format: "metadata",
    });
    ["From", "Subject", "Date"].forEach((h) => metaParams.append("metadataHeaders", h));

    const messages = await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?${metaParams.toString()}`,
          { headers: authHeader, cache: "no-store" }
        );
        if (!res.ok) return null;
        return (await res.json()) as GmailMessageMeta;
      })
    );

    const formatted = messages
      .filter((m): m is GmailMessageMeta => m !== null)
      .map((m) => {
        const headers = m.payload?.headers;
        const from = getHeader(headers, "From");
        const subject = getHeader(headers, "Subject") || "(No subject)";
        const isUnread = m.labelIds?.includes("UNREAD") ?? false;
        const dateMs = m.internalDate ? parseInt(m.internalDate, 10) : Date.now();

        return {
          id: m.id,
          from: parseFromName(from),
          fromEmail: from,
          subject,
          snippet: m.snippet ?? "",
          unread: isUnread,
          timestamp: new Date(dateMs).toISOString(),
        };
      })
      // Gmail's list endpoint already returns newest-first, but be explicit
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ messages: formatted });
  } catch (err) {
    console.error("Failed to fetch Gmail messages:", err);
    return NextResponse.json(
      { error: "fetch_failed", message: "Could not reach Gmail." },
      { status: 500 }
    );
  }
}
