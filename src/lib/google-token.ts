import { prisma } from "@/lib/prisma";
import { hasFeatureScopes, type GoogleFeature } from "@/lib/google-scopes";

/**
 * Returns a valid Google access token for the given user, refreshing it
 * via Google's OAuth endpoint if expired. Updates the stored Account
 * record with the new token/expiry. Used by both the Calendar and
 * Gmail routes since they share the same Google account connection.
 *
 * Returns null if the user has no Google account linked, if the account was
 * never granted the feature passed in `need` (sign-in only asks for profile
 * scopes), or if the refresh fails (e.g. the user revoked access).
 */
export async function getGoogleAccessToken(
  userId: string,
  need?: GoogleFeature
): Promise<{
  accessToken: string | null;
  error?: "no_account" | "missing_scope" | "no_refresh_token" | "refresh_failed";
}> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account) {
    return { accessToken: null, error: "no_account" };
  }

  // A null scope is unknown (older rows), not "none": let the API call decide.
  if (need && account.scope && !hasFeatureScopes(account.scope, need)) {
    return { accessToken: null, error: "missing_scope" };
  }

  const now = Math.floor(Date.now() / 1000);
  const isExpired = !account.expires_at || account.expires_at < now;

  if (!isExpired && account.access_token) {
    return { accessToken: account.access_token };
  }

  if (!account.refresh_token) {
    return { accessToken: null, error: "no_refresh_token" };
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        grant_type: "refresh_token",
        refresh_token: account.refresh_token,
      }),
    });

    const refreshed = await response.json();
    if (!response.ok) throw refreshed;

    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: refreshed.access_token,
        expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
        refresh_token: refreshed.refresh_token ?? account.refresh_token,
      },
    });

    return { accessToken: refreshed.access_token };
  } catch (err) {
    console.error("Failed to refresh Google access token:", err);
    return { accessToken: null, error: "refresh_failed" };
  }
}
