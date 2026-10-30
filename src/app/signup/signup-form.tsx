"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction, type SignupState } from "./actions";
import { SELF_PAY_CHOICE } from "./choices";

const field = "h-12 text-base";

export function SignupForm({
  orgs,
  agreement,
  smsConsentText,
  billSmsConsentText,
}: {
  orgs: { id: string; name: string }[];
  agreement: React.ReactNode;
  smsConsentText: string;
  billSmsConsentText: string;
}) {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupAction, {});
  const v = state.values ?? {};
  // Which payer is picked and whether a case manager email is typed decide
  // which fields show. After an error, start again from what was sent back.
  const [choice, setChoice] = useState(v.orgId ?? "");
  const [cmEmail, setCmEmail] = useState(v.caseManagerEmail ?? "");
  const [shownValues, setShownValues] = useState(state.values);
  if (state.values !== shownValues) {
    setShownValues(state.values);
    setChoice(state.values?.orgId ?? "");
    setCmEmail(state.values?.caseManagerEmail ?? "");
  }
  const selfPay = choice === SELF_PAY_CHOICE;

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Spam trap: hidden from people, filled in by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <h2 className="text-xl font-semibold">About you</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">Legal first name</Label>
          <Input id="firstName" name="firstName" required defaultValue={v.firstName} className={field} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Legal last name</Label>
          <Input id="lastName" name="lastName" required defaultValue={v.lastName} className={field} />
        </div>
      </div>
      <Label htmlFor="dateOfBirth">Date of birth</Label>
      <Input id="dateOfBirth" name="dateOfBirth" type="date" required defaultValue={v.dateOfBirth} className={field} />
      <Label htmlFor="phone">Phone (optional)</Label>
      <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={v.phone} className={field} />
      <Label htmlFor="email">Email {selfPay ? "(where we send your monthly bill)" : "(optional)"}</Label>
      <Input id="email" name="email" type="email" defaultValue={v.email} className={field} />

      <h2 className="mt-2 text-xl font-semibold">Who pays for your mailbox?</h2>
      <Label htmlFor="orgId">Sponsoring nonprofit</Label>
      <select
        id="orgId"
        name="orgId"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className="h-12 rounded-md border bg-transparent px-3"
      >
        <option value="" className="text-black">
          Not listed (type it below)
        </option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id} className="text-black">
            {o.name}
          </option>
        ))}
        <option value={SELF_PAY_CHOICE} className="text-black">
          No sponsor – I&apos;ll pay myself
        </option>
      </select>
      {selfPay ? (
        <div className="flex flex-col gap-3 rounded-lg border border-[#ffd166]/60 p-3">
          <p>
            You pay a monthly price, set when you activate your mailbox at the shop (usually $15 a month). The first 3
            months are the minimum; after that it&apos;s month to month. We send your bill each month by email, or by
            text if you check the box below.
          </p>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="billSmsConsent"
              defaultChecked={v.billSmsConsent === "on"}
              className="mt-1 size-6 shrink-0"
            />
            <span>
              {billSmsConsentText} <span className="opacity-70">(Optional. Needs a phone number above.)</span>
            </span>
          </label>
        </div>
      ) : (
        <>
          <Label htmlFor="orgOther">Nonprofit name, if not listed</Label>
          <Input id="orgOther" name="orgOther" defaultValue={v.orgOther} className={field} />
        </>
      )}

      <h2 className="mt-2 text-xl font-semibold">Case manager (optional)</h2>
      <Label htmlFor="caseManagerName">Case manager&apos;s name</Label>
      <Input id="caseManagerName" name="caseManagerName" defaultValue={v.caseManagerName} className={field} />
      <Label htmlFor="caseManagerEmail">Case manager&apos;s email</Label>
      <Input
        id="caseManagerEmail"
        name="caseManagerEmail"
        type="email"
        value={cmEmail}
        onChange={(e) => setCmEmail(e.target.value)}
        className={field}
      />
      {cmEmail.trim() && (
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="delegateConsent"
            defaultChecked={v.delegateConsent === "on"}
            className="mt-1 size-6 shrink-0"
          />
          <span>I give permission for my case manager to see my mail online and make requests for me. (Optional.)</span>
        </label>
      )}

      <h2 className="mt-2 text-xl font-semibold">Mailbox agreement</h2>
      <div className="max-h-80 overflow-y-auto rounded-lg border border-[#7fe3d4]/50 bg-white/5 p-4 text-sm">{agreement}</div>
      <p className="text-sm">
        Your mailbox is not active until you show <strong>two forms of ID</strong> (one with a photo) and sign USPS Form
        1583 in person, at our shop or at a sign-up day with your nonprofit. We&apos;ll tell you when.
      </p>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="smsConsent" defaultChecked={v.smsConsent === "on"} className="mt-1 size-6 shrink-0" />
        <span>
          {smsConsentText} <span className="opacity-70">(Optional.)</span>
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="agreed" required defaultChecked={v.agreed === "on"} className="mt-1 size-6 shrink-0" />
        <span>
          <strong>I have read the mailbox agreement above, or had it read to me, and I agree to it.</strong>
        </span>
      </label>
      <Label htmlFor="signatureName">Type your full name to sign</Label>
      <Input id="signatureName" name="signatureName" required defaultValue={v.signatureName} autoComplete="off" className={field} />

      {state.error && (
        <p role="alert" className="rounded-lg bg-[#f48fb1] p-3 font-semibold text-[#1c1a1d]">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-14 bg-[#7fe3d4] text-lg text-[#1c1a1d] hover:bg-[#a6efe4]">
        {pending ? "Sending…" : "Sign and send"}
      </Button>
    </form>
  );
}
