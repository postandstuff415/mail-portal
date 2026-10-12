import type { Metadata } from "next";
import { AgreementText } from "@/components/agreement-text";
import { PublicPage } from "@/components/public-page";
import { CURRENT_AGREEMENT } from "@/lib/agreement";
import { db } from "@/lib/db";
import { SMS_CONSENT_TEXT } from "@/lib/sms-consent";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up · Post and Stuff" };
export const dynamic = "force-dynamic";

// Public sign-up for nonprofit-referred clients (the flier QR code points here).
export default async function SignupPage() {
  const orgs = await db.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <PublicPage title="Mailbox sign-up">
      <p>
        Free for clients of our partner nonprofits. Fill this out with your case manager, then bring two IDs to sign
        USPS Form 1583 in person.
      </p>
      <SignupForm orgs={orgs} agreement={<AgreementText agreement={CURRENT_AGREEMENT} />} smsConsentText={SMS_CONSENT_TEXT} />
    </PublicPage>
  );
}
