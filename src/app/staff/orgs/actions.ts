"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

export type OrgState = { error?: string; saved?: string };

const orgSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z.union([z.literal(""), z.string().trim().email("Check the email address")]).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  billingTerms: z.enum(["NET30", "NET60"]),
});

export async function createOrg(_prev: OrgState, formData: FormData): Promise<OrgState> {
  await requireStaff();
  const parsed = orgSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  await db.organization.create({
    data: {
      name: d.name,
      contactName: d.contactName || null,
      contactEmail: d.contactEmail || null,
      contactPhone: d.contactPhone || null,
      billingTerms: d.billingTerms,
    },
  });
  revalidatePath("/staff/orgs");
  return { saved: d.name };
}
