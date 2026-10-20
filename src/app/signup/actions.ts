"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { ZodError } from "zod";
import { ipFromHeaders } from "@/lib/audit";
import { createApplication, SignupError } from "@/lib/signup";
import { notifyNewSignup } from "@/lib/signup-email";

export type SignupState = { error?: string; values?: Record<string, string> };

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  void _prev;
  const get = (k: string) => String(formData.get(k) ?? "");
  // Hidden field real people never fill in; bots usually do.
  if (get("website")) redirect("/signup/thanks");

  const values = {
    firstName: get("firstName"),
    lastName: get("lastName"),
    dateOfBirth: get("dateOfBirth"),
    phone: get("phone"),
    email: get("email"),
    orgId: get("orgId"),
    orgOther: get("orgOther"),
    caseManagerName: get("caseManagerName"),
    caseManagerEmail: get("caseManagerEmail"),
    signatureName: get("signatureName"),
    // Echoed back after an error so the person's own choices stay ticked.
    delegateConsent: get("delegateConsent"),
    smsConsent: get("smsConsent"),
    agreed: get("agreed"),
  };
  const h = await headers();
  try {
    const app = await createApplication(
      {
        ...values,
        delegateConsent: get("delegateConsent") === "on",
        smsConsent: get("smsConsent") === "on",
        agreed: (get("agreed") === "on") as true,
      },
      { ip: ipFromHeaders(h), userAgent: h.get("user-agent") },
    );
    // Email the owner after the page responds; a failed email never blocks a sign-up.
    after(() =>
      notifyNewSignup(app.id).catch((e) =>
        console.error("Sign-up alert email failed:", e instanceof Error ? e.message : e),
      ),
    );
  } catch (error) {
    // Send back what they typed so they don't have to start over.
    if (error instanceof ZodError) return { error: error.issues[0].message, values };
    if (error instanceof SignupError) return { error: error.message, values };
    throw error;
  }
  redirect("/signup/thanks");
}
