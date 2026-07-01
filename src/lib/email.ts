import { Resend } from "resend";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Vyris <onboarding@resend.dev>";

/**
 * Sends an email via Resend. Returns { sent: false, reason } instead of
 * throwing when RESEND_API_KEY isn't configured, so callers can degrade
 * gracefully (e.g. still create the invite, just skip the email).
 *
 * Note: onboarding@resend.dev only delivers to the email address you
 * signed up to Resend with, until you verify your own sending domain.
 * Fine for testing; add RESEND_FROM_EMAIL with a verified domain for
 * real multi-recipient sending.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured." };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("Resend send error:", error);
      return { sent: false, reason: error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error("Failed to send email via Resend:", err);
    return { sent: false, reason: "Email provider request failed." };
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function inviteEmailHtml(params: {
  inviterName: string;
  teamName: string;
  inviteUrl: string;
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #0E1116;">You're invited to ${escapeHtml(params.teamName)} on Vyris</h2>
      <p style="color: #444; line-height: 1.6;">
        ${escapeHtml(params.inviterName)} invited you to join their team workspace on Vyris,
        an AI Chief of Staff. Click below to accept and get started.
      </p>
      <a href="${params.inviteUrl}"
         style="display: inline-block; margin-top: 16px; padding: 12px 24px;
                background: #C9A66B; color: #1a140a; text-decoration: none;
                border-radius: 8px; font-weight: 600;">
        Accept invite
      </a>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        This invite expires in 7 days. If you weren't expecting this, you can ignore it.
      </p>
    </div>
  `;
}

export function teamMessageEmailHtml(params: { senderName: string; content: string }): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #0E1116;">New message from ${escapeHtml(params.senderName)}</h2>
      <div style="background: #f5f2ec; border-radius: 8px; padding: 16px; margin-top: 12px;">
        <p style="color: #333; line-height: 1.6; margin: 0; white-space: pre-wrap;">${escapeHtml(
          params.content
        )}</p>
      </div>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        Sent via Vyris. Reply directly to this email or open Vyris to continue the conversation.
      </p>
    </div>
  `;
}
