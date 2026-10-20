import { db } from "@/lib/db";
import { escapeHtml, sendEmail, type Email, type EmailSender } from "@/lib/email";

// Heads-up to the shop owner each time someone signs up online.
// Only name, nonprofit, and time: date of birth, phone, and email stay in the
// portal, behind the staff login.

export const SIGNUP_ALERT_TO = process.env.SIGNUP_ALERT_EMAIL || "postandstuff415@gmail.com";

const PT = { timeZone: "America/Los_Angeles" } as const;

export function signupAlertEmail(app: {
  firstName: string;
  lastName: string;
  orgName: string | null;
  createdAt: Date;
}): Email {
  const name = `${app.firstName} ${app.lastName}`;
  const org = app.orgName ?? "no nonprofit picked";
  const when = app.createdAt.toLocaleString("en-US", { ...PT, dateStyle: "medium", timeStyle: "short" });
  const link = `${process.env.APP_URL ?? "https://postandstuff.com"}/staff/signups`;
  return {
    to: SIGNUP_ALERT_TO,
    subject: `New sign-up: ${name}`,
    html: `<div style="font-family:Arial,sans-serif;color:#111">
<p><strong>${escapeHtml(name)}</strong> signed up for a mailbox.</p>
<p>Nonprofit: ${escapeHtml(org)}<br>Signed up: ${escapeHtml(when)}</p>
<p><a href="${escapeHtml(link)}">See it on the Sign-ups page</a> (staff login needed).</p>
</div>`,
    text: `${name} signed up for a mailbox.\nNonprofit: ${org}\nSigned up: ${when}\n\nSee it on the Sign-ups page: ${link}`,
  };
}

export async function notifyNewSignup(applicationId: string, send: EmailSender = sendEmail) {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: { org: { select: { name: true } } },
  });
  if (!app) return false;
  return send(signupAlertEmail({ ...app, orgName: app.org?.name ?? app.orgOther }));
}
