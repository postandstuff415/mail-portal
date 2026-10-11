"use client";

import Link from "next/link";
import { useActionState } from "react";
import { IntakeCard } from "@/components/intake-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientAction, type NewClientState } from "./actions";

export function NewClientForm({ orgs }: { orgs: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<NewClientState, FormData>(createClientAction, {});

  if (state.card) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-lg print:hidden">
          Client added. Print this card now — the PIN is shown only once.
        </p>
        <IntakeCard {...state.card} />
        <div className="flex gap-3 print:hidden">
          <Button onClick={() => window.print()} className="h-12 flex-1 bg-[#ffd166] text-[#1c1a1d]">
            Print card
          </Button>
          <Link href="/staff/clients/new" className="flex h-12 flex-1 items-center justify-center rounded-md border border-[#7fe3d4] text-[#7fe3d4]">
            Add another
          </Link>
        </div>
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <p>
        Add a nonprofit first:{" "}
        <Link href="/staff/orgs" className="text-[#ffd166] underline">
          Nonprofits
        </Link>
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <Label htmlFor="pmbNumber">Mailbox number (PMB)</Label>
      <Input id="pmbNumber" name="pmbNumber" required className="h-12 uppercase" />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required className="h-12" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required className="h-12" />
        </div>
      </div>
      <Label htmlFor="orgId">Nonprofit</Label>
      <select id="orgId" name="orgId" required className="h-12 rounded-md border bg-transparent px-3">
        {orgs.map((o) => (
          <option key={o.id} value={o.id} className="text-black">
            {o.name}
          </option>
        ))}
      </select>
      <Label htmlFor="phone">Cell phone for text alerts (optional)</Label>
      <Input id="phone" name="phone" type="tel" inputMode="tel" className="h-12" />
      <Label htmlFor="idExpiresAt">ID expiration date</Label>
      <Input id="idExpiresAt" name="idExpiresAt" type="date" className="h-12" />
      <label className="flex items-center gap-3 py-2 text-base">
        <input type="checkbox" name="form1583OnFile" className="size-6" />
        PS Form 1583 signed with two IDs, on file
      </label>
      {state.error && <p className="text-[#f48fb1]">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-14 bg-[#7fe3d4] text-lg text-[#1c1a1d] hover:bg-[#a6efe4]">
        {pending ? "Saving…" : "Add client and make PIN"}
      </Button>
    </form>
  );
}
