import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getGoogleAccessToken } from "@/lib/google-token";

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function extractBody(payload: GmailPart | undefined): string {
  if (!payload) return "";

  const stack: GmailPart[] = [payload];
  let htmlFallback = "";

  while (stack.length > 0) {
    const part = stack.pop()!;
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.mimeType === "text/html" && part.body?.data && !htmlFallback) {
      htmlFallback = decodeBase64Url(part.body.data);
    }
    if (part.parts) stack.push(...part.parts);
  }

  return htmlFallback.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Sign in with Google to view this email." },
      { status: 401 }
    );
  }

  const { accessToken, error } = await getGoogleAccessToken(session.user.id);

  if (!accessToken) {
    const message =
      error === "no_refresh_token" || error === "refresh_failed"
        ? "Your Google session expired. Please sign in again."
        : "Connect Gmail to view this email.";
    return NextResponse.json({ error: error ?? "not_authenticated", message }, { status: 401 });
  }

  try {
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("Gmail get error:", res.status, body);
      return NextResponse.json(
        { error: "gmail_api_error", message: "Could not load this email." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const headers = data.payload?.headers as GmailHeader[] | undefined;

    return NextResponse.json({
      id: data.id,
      from: getHeader(headers, "From"),
      to: getHeader(headers, "To"),
      subject: getHeader(headers, "Subject") || "(No subject)",
      date: getHeader(headers, "Date"),
      body: extractBody(data.payload),
    });
  } catch (err) {
    console.error("Failed to fetch email body:", err);
    return NextResponse.json(
      { error: "fetch_failed", message: "Could not reach Gmail." },
      { status: 500 }
    );
  }
}