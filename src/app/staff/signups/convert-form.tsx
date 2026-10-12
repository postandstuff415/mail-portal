"use client";

import { useActionState } from "react";
import { IntakeCard } from "@/components/intake-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertAction, type ConvertState } from "./actions";

export function ConvertForm({
  applicationId,
  orgs,
  defaultOrgId,
}: {
  applicationId: string;
  orgs: { id: string; name: string }[];
  defaultOrgId: string;
}) {
  const [state, action, pending] = useActionState<ConvertState, FormData>(convertAction.bind(null, applicationId), {});

  if (state.card) {
    return (
      <div className="flex flex-col gap-3">
        <p className="print:hidden">
          Client created.{" "}
          {state.delegateAdded
            ? "Their case manager can now see their mail."
            : "Their case manager has no account yet: add them under People, then give access on the client's page."}{" "}
          Print the card now; the PIN is shown only once.
        </p>
        <IntakeCard {...state.card} />
        <Button onClick={() => window.print()} className="h-12 bg-[#ffd166] text-[#1c1a1d] print:hidden">
          Print card
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 print:hidden">
      <Label htmlFor={`pmb-${applicationId}`}>Mailbox number (PMB)</Label>
      <Input id={`pmb-${applicationId}`} name="pmbNumber" required className="h-12 uppercase" />
      <Label htmlFor={`org-${applicationId}`}>Nonprofit</Label>
      <select
        id={`org-${applicationId}`}
        name="orgId"
        required
        defaultValue={defaultOrgId}
        className="h-12 rounded-md border bg-transparent px-3"
      >
        <option value="" className="text-black">
          Pick one
        </option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id} className="text-black">
            {o.name}
          </option>
        ))}
      </select>
      <Label htmlFor={`id-${applicationId}`}>ID expiration date</Label>
      <Input id={`id-${applicationId}`} name="idExpiresAt" type="date" className="h-12" />
      <label className="flex items-start gap-3">
        <input type="checkbox" name="form1583OnFile" className="mt-1 size-6 shrink-0" />
        Two IDs checked and PS Form 1583 signed in front of me.
      </label>
      {state.error && <p className="text-[#f48fb1]">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-12 bg-[#7fe3d4] text-[#1c1a1d] hover:bg-[#a6efe4]">
        {pending ? "Creating…" : "Create client and PIN"}
      </Button>
    </form>
  );
}
