import { Resend } from "resend";

// Email through Resend once it's set up and switched on (EMAIL_LIVE=true).
// Until then emails are only printed to the server log, never sent.

export type Email = { to: string; subject: string; html: string; text: string };
// Resolves true when the email was really sent, false on a dry run.
export type EmailSender = (email: Email) => Promise<boolean>;

export function emailConfigured(): boolean {
  return process.env.EMAIL_LIVE === "true" && !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export const sendEmail: EmailSender = async (email) => {
  if (!emailConfigured()) {
    console.log(`[email dry run] to ${email.to}: ${email.subject}`);
    return false;
  }
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.EMAIL_FROM!,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) throw new Error(`Email failed: ${error.message}`);
  return true;
};

export function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
