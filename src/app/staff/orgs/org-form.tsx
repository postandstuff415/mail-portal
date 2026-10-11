"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrg, type OrgState } from "./actions";

export function OrgForm() {
  const [state, action, pending] = useActionState<OrgState, FormData>(createOrg, {});
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-[#7fe3d4]/50 p-4">
      <h2 className="text-lg font-semibold">Add a nonprofit</h2>
      <Label htmlFor="name">Name</Label>
      <Input id="name" name="name" required className="h-12" />
      <Label htmlFor="contactName">Billing contact</Label>
      <Input id="contactName" name="contactName" className="h-12" />
      <Label htmlFor="contactEmail">Billing email</Label>
      <Input id="contactEmail" name="contactEmail" type="email" className="h-12" />
      <Label htmlFor="contactPhone">Phone</Label>
      <Input id="contactPhone" name="contactPhone" type="tel" className="h-12" />
      <Label htmlFor="billingTerms">Payment terms</Label>
      <select id="billingTerms" name="billingTerms" className="h-12 rounded-md border bg-transparent px-3">
        <option value="NET30" className="text-black">Net 30</option>
        <option value="NET60" className="text-black">Net 60</option>
      </select>
      {state.error && <p className="text-[#f48fb1]">{state.error}</p>}
      {state.saved && <p className="text-[#7fe3d4]">Added {state.saved}.</p>}
      <Button type="submit" disabled={pending} className="h-12 bg-[#7fe3d4] text-[#1c1a1d] hover:bg-[#a6efe4]">
        {pending ? "Saving…" : "Add nonprofit"}
      </Button>
    </form>
  );
}
