import { z } from "zod";
import { CURRENT_AGREEMENT } from "@/lib/agreement";
import { db } from "@/lib/db";
import { addDelegate } from "@/lib/delegates";
import { createClient, IntakeError, normalizePhone } from "@/lib/intake";
import { isStaff, type Viewer } from "@/lib/permissions";

// Online sign-up at postandstuff.com/signup (replaces the Tally intake form).
// The person reads and e-signs the client agreement; nothing is active until
// staff check two IDs and witness PS Form 1583 in person.

export class SignupError extends Error {}

const MAX_PER_IP_PER_HOUR = 5;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

export const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name.").max(80),
    lastName: z.string().trim().min(1, "Enter your last name.").max(80),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
      .transform((s) => new Date(`${s}T12:00:00Z`))
      .refine((d) => d.getUTCFullYear() >= 1900 && d < new Date(), "Check your date of birth."),
    phone: optionalText(20),
    email: z.union([z.literal(""), z.string().trim().email("Check the email address.").max(200)]).optional(),
    orgId: optionalText(40),
    orgOther: optionalText(120),
    caseManagerName: z.string().trim().min(1, "Enter your case manager's name.").max(120),
    caseManagerEmail: z.string().trim().toLowerCase().email("Check your case manager's email.").max(200),
    delegateConsent: z.boolean(),
    smsConsent: z.boolean(),
    agreed: z.literal(true, { message: "Check the box to agree to the mailbox agreement." }),
    signatureName: z.string().trim().min(1, "Type your full name to sign."),
  })
  .refine((d) => d.orgId || d.orgOther, { message: "Pick your nonprofit, or type its name.", path: ["orgId"] })
  .refine((d) => !d.smsConsent || !!d.phone, { message: "Add a phone number to get text alerts.", path: ["phone"] })
  .refine(
    (d) => squash(d.signatureName) === squash(`${d.firstName} ${d.lastName}`),
    { message: "Your typed signature must match your first and last name.", path: ["signatureName"] },
  );

function squash(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function createApplication(
  input: z.input<typeof signupSchema>,
  meta: { ip: string | null; userAgent: string | null },
) {
  const data = signupSchema.parse(input);
  if (meta.ip) {
    const recent = await db.application.count({
      where: { ip: meta.ip, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= MAX_PER_IP_PER_HOUR) throw new SignupError("Too many sign-ups from this connection. Try again later.");
  }
  let phone: string | undefined;
  try {
    phone = data.phone ? normalizePhone(data.phone) : undefined;
  } catch {
    throw new SignupError("Phone must be a 10-digit US number.");
  }
  const orgId =
    data.orgId && (await db.organization.findUnique({ where: { id: data.orgId }, select: { id: true } }))
      ? data.orgId
      : null;

  return db.application.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      phone: phone ?? null,
      email: data.email || null,
      orgId,
      orgOther: orgId ? null : (data.orgOther ?? null),
      caseManagerName: data.caseManagerName,
      caseManagerEmail: data.caseManagerEmail,
      delegateConsent: data.delegateConsent,
      smsConsent: data.smsConsent,
      agreementVersion: CURRENT_AGREEMENT.version,
      signatureName: data.signatureName,
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
    },
  });
}

// On a 1583 day: IDs checked, form witnessed. Turn the sign-up into a client.
export async function convertApplication(
  viewer: Viewer | null | undefined,
  applicationId: string,
  input: { pmbNumber: string; orgId: string; idExpiresAt?: Date; form1583OnFile: boolean },
) {
  if (!isStaff(viewer)) throw new SignupError("Staff only.");
  const app = await db.application.findUnique({ where: { id: applicationId } });
  if (!app || app.status !== "PENDING") throw new SignupError("This sign-up was already handled.");
  if (!input.form1583OnFile) throw new SignupError("Check two IDs and witness the 1583 first.");

  let result;
  try {
    result = await createClient(viewer, {
      pmbNumber: input.pmbNumber,
      firstName: app.firstName,
      lastName: app.lastName,
      orgId: input.orgId,
      phone: app.phone ?? undefined,
      form1583OnFile: true,
      smsConsent: app.smsConsent && !!app.phone,
      idExpiresAt: input.idExpiresAt,
    });
  } catch (error) {
    if (error instanceof IntakeError) throw new SignupError(error.message);
    throw error;
  }
  // Keep the original online consent time, not the time staff clicked.
  if (result.client.smsConsentAt) {
    await db.client.update({ where: { id: result.client.id }, data: { smsConsentAt: app.signedAt } });
  }
  await db.application.update({ where: { id: app.id }, data: { status: "CONVERTED", clientId: result.client.id } });

  // If they agreed online and their case manager already has an account, give access.
  let delegateAdded = false;
  if (app.delegateConsent && app.caseManagerEmail) {
    const cm = await db.user.findUnique({ where: { email: app.caseManagerEmail } });
    if (cm?.role === "CASE_MANAGER") {
      await addDelegate(viewer, result.client.id, cm.id, true);
      delegateAdded = true;
    }
  }
  return { ...result, delegateAdded };
}

export async function rejectApplication(viewer: Viewer | null | undefined, applicationId: string) {
  if (!isStaff(viewer)) throw new SignupError("Staff only.");
  await db.application.updateMany({ where: { id: applicationId, status: "PENDING" }, data: { status: "REJECTED" } });
}
