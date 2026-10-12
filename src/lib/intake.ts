import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { MailType } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { isStaff, type Viewer } from "@/lib/permissions";
import { generatePin, normalizePmb } from "@/lib/pin";
import { BCRYPT_ROUNDS } from "@/lib/security";
import { sendSms } from "@/lib/sms";
import { SMS_WELCOME_TEXT } from "@/lib/sms-consent";
import { deleteMailImage, putMailImage } from "@/lib/storage";

// Staff intake: new clients and incoming mail. Every function re-checks that
// the caller is staff, so it's safe no matter which page calls it.

export class IntakeError extends Error {}

function assertStaff(viewer: Viewer | null | undefined) {
  if (!isStaff(viewer)) throw new IntakeError("Staff only.");
}

export const newClientSchema = z.object({
  pmbNumber: z.string().trim().min(1, "Mailbox number is required").max(20),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  orgId: z.string().min(1, "Pick the nonprofit"),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : undefined)),
  form1583OnFile: z.boolean(),
  // The client signed the text-alert agreement on the intake form.
  smsConsent: z.boolean().default(false),
  idExpiresAt: z.date().optional(),
});
export type NewClientInput = z.input<typeof newClientSchema>;

// US phone numbers to +1XXXXXXXXXX; anything else is rejected.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new IntakeError("Phone must be a 10-digit US number.");
}

export async function createClient(viewer: Viewer | null | undefined, input: NewClientInput) {
  assertStaff(viewer);
  const data = newClientSchema.parse(input);
  const pmbNumber = normalizePmb(data.pmbNumber);

  if (await db.client.findUnique({ where: { pmbNumber }, select: { id: true } })) {
    throw new IntakeError(`Mailbox ${pmbNumber} is already taken.`);
  }
  if (!(await db.organization.findUnique({ where: { id: data.orgId }, select: { id: true } }))) {
    throw new IntakeError("That nonprofit doesn't exist.");
  }
  if (data.smsConsent && !data.phone) {
    throw new IntakeError("Add a phone number to turn on text alerts.");
  }

  const pin = generatePin();
  const client = await db.client.create({
    data: {
      pmbNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      orgId: data.orgId,
      phone: data.phone ? normalizePhone(data.phone) : null,
      form1583OnFile: data.form1583OnFile,
      smsConsentAt: data.smsConsent ? new Date() : null,
      idExpiresAt: data.idExpiresAt ?? null,
      pinHash: await bcrypt.hash(pin, BCRYPT_ROUNDS),
    },
  });
  if (client.phone && client.smsConsentAt) {
    // A failed welcome text must not undo the sign-up; staff can still see the client.
    await sendSms(client.phone, SMS_WELCOME_TEXT).catch((error) =>
      console.error("Welcome text failed:", error instanceof Error ? error.message : error),
    );
  }
  return { client, pin };
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Identify the image from its first bytes rather than trusting the browser's label.
export function detectImageType(bytes: Uint8Array): { contentType: string; ext: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", ext: "jpg" };
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { contentType: "image/png", ext: "png" };
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { contentType: "image/webp", ext: "webp" };
  }
  return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

export type ReceiveInput = {
  pmbNumber: string;
  image: Uint8Array;
  type: MailType;
  urgent: boolean;
  shelfLocation?: string;
  sender?: string;
};

export async function receiveMail(viewer: Viewer | null | undefined, input: ReceiveInput, ip?: string | null) {
  assertStaff(viewer);
  const client = await db.client.findUnique({ where: { pmbNumber: normalizePmb(input.pmbNumber) } });
  if (!client) throw new IntakeError("No client with that mailbox number.");
  if (client.status !== "ACTIVE") throw new IntakeError("This mailbox is not active.");
  if (!client.form1583OnFile) {
    throw new IntakeError("No PS Form 1583 on file for this client. USPS rules say don't accept their mail yet.");
  }
  if (input.image.length === 0 || input.image.length > MAX_IMAGE_BYTES) {
    throw new IntakeError("The photo is empty or too large.");
  }
  const kind = detectImageType(input.image);
  if (!kind) throw new IntakeError("That file isn't a photo (JPEG, PNG, or WebP).");

  const key = `mail/${client.id}/${randomUUID()}.${kind.ext}`;
  await putMailImage(key, input.image, kind.contentType);

  try {
    const receivedAt = new Date();
    const item = await db.mailItem.create({
      data: {
        clientId: client.id,
        receivedAt,
        type: input.type,
        urgent: input.urgent,
        shelfLocation: input.shelfLocation?.trim() || null,
        sender: input.sender?.trim() || null,
        retainUntil: addDays(receivedAt, client.holdDays),
        images: { create: { kind: "ENVELOPE", r2Key: key, pageNumber: 1 } },
      },
    });
    await writeAudit({ action: "UPLOAD", userId: viewer!.id, clientId: client.id, mailItemId: item.id, ip });
    return { item, client };
  } catch (error) {
    // Don't leave an orphaned photo in storage if the database save failed.
    await deleteMailImage(key).catch(() => {});
    throw error;
  }
}

// After an "Open and scan" request: staff photograph each page of the contents.
export async function addContentsPage(
  viewer: Viewer | null | undefined,
  mailItemId: string,
  image: Uint8Array,
  ip?: string | null,
) {
  assertStaff(viewer);
  const item = await db.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item) throw new IntakeError("Mail not found.");
  if (image.length === 0 || image.length > MAX_IMAGE_BYTES) throw new IntakeError("The photo is empty or too large.");
  const kind = detectImageType(image);
  if (!kind) throw new IntakeError("That file isn't a photo (JPEG, PNG, or WebP).");

  const key = `mail/${item.clientId}/${randomUUID()}.${kind.ext}`;
  await putMailImage(key, image, kind.contentType);
  try {
    const pages = await db.mailImage.count({ where: { mailItemId, kind: "CONTENTS" } });
    await db.$transaction([
      db.mailImage.create({ data: { mailItemId, kind: "CONTENTS", r2Key: key, pageNumber: pages + 1 } }),
      db.mailItem.update({ where: { id: mailItemId }, data: { status: "OPENED" } }),
      db.request.updateMany({
        where: { mailItemId, type: "OPEN_AND_SCAN", status: "OPEN" },
        data: { status: "DONE" },
      }),
    ]);
    await writeAudit({ action: "UPLOAD", userId: viewer!.id, clientId: item.clientId, mailItemId, ip });
    return { page: pages + 1 };
  } catch (error) {
    await deleteMailImage(key).catch(() => {});
    throw error;
  }
}

export async function lookupClientByPmb(viewer: Viewer | null | undefined, pmb: string) {
  assertStaff(viewer);
  return db.client.findUnique({
    where: { pmbNumber: normalizePmb(pmb) },
    select: { pmbNumber: true, firstName: true, lastName: true, status: true, form1583OnFile: true },
  });
}

// What a client's QR code points to: the login page with their mailbox number
// filled in. Staff scanners read the same code to pick the mailbox.
export function intakeQrUrl(pmbNumber: string): string {
  const base = (process.env.APP_URL ?? "https://postandstuff.com").replace(/\/$/, "");
  return `${base}/login?pmb=${encodeURIComponent(pmbNumber)}`;
}
