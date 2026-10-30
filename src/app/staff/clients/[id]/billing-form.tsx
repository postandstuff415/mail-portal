"use client";

import { useActionState } from "react";
import { BillingFields } from "@/components/billing-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { billThisMonthAction, markBillPaidAction, sendBillAction, updateBillingAction, type BillingState } from "./actions";

export function BillingForm({
  clientId,
  orgs,
  orgId,
  selfPay,
  price,
  email,
  billTexts,
}: {
  clientId: string;
  orgs: { id: string; name: string }[];
  orgId: string;
  selfPay: boolean;
  price: string;
  email: string;
  billTexts: boolean;
}) {
  const [state, action, pending] = useActionState<BillingState, FormData>(updateBillingAction.bind(null, clientId), {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <BillingFields idPrefix={`client-${clientId}`} orgs={orgs} defaultOrgId={orgId} selfPay={selfPay} defaultPrice={price} />
      <Label htmlFor={`email-${clientId}`}>Email for bills</Label>
      <Input id={`email-${clientId}`} name="email" type="email" defaultValue={email} className="h-12" />
      <label className="flex items-start gap-3">
        <input type="checkbox" name="billSmsConsent" defaultChecked={billTexts} className="mt-1 size-6 shrink-0" />
        <span>Client agreed in writing to get their monthly bill by text</span>
      </label>
      {state.error && <p className="text-[#f48fb1]">{state.error}</p>}
      {state.ok && <p className="text-[#7fe3d4]">{state.ok}</p>}
      <Button type="submit" disabled={pending} className="h-12 bg-[#7fe3d4] text-[#1c1a1d] hover:bg-[#a6efe4]">
        {pending ? "Saving…" : "Save billing"}
      </Button>
    </form>
  );
}

export function BillThisMonthButton({ clientId, label }: { clientId: string; label: string }) {
  const [state, action, pending] = useActionState<BillingState, FormData>(billThisMonthAction.bind(null, clientId), {});
  return (
    <form action={action}>
      <button type="submit" disabled={pending} className="text-[#ffd166] underline">
        {pending ? "Making…" : label}
      </button>
      {state.ok && <span className="ml-2 text-[#7fe3d4]">{state.ok}</span>}
      {state.error && <span className="ml-2 text-[#f48fb1]">{state.error}</span>}
    </form>
  );
}

export function BillButtons({ clientId, billId, sent }: { clientId: string; billId: string; sent: boolean }) {
  const [state, action, pending] = useActionState<BillingState, FormData>(sendBillAction.bind(null, clientId, billId), {});
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <form action={action}>
        <button type="submit" disabled={pending} className="text-[#ffd166] underline">
          {pending ? "Sending…" : sent ? "Send again" : "Send"}
        </button>
      </form>
      <form action={markBillPaidAction.bind(null, clientId, billId)}>
        <button type="submit" className="text-[#ffd166] underline">
          Mark paid
        </button>
      </form>
      {state.ok && <span className="text-[#7fe3d4]">{state.ok}</span>}
      {state.error && <span className="text-[#f48fb1]">{state.error}</span>}
    </div>
  );
}
