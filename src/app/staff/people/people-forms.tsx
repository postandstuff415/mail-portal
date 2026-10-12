"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPersonAction, resetPasswordAction, type PersonState, type ResetState } from "./actions";

function TempPassword({ password }: { password: string }) {
  return (
    <p className="mt-2 rounded-lg border-2 border-[#ffd166] p-3">
      Temporary password (shown once):{" "}
      <span className="font-mono text-xl tracking-wide text-[#ffd166]">{password}</span>
      <span className="block text-sm opacity-80">
        Give it to them privately. They log in at postandstuff.com and change it under Password.
      </span>
    </p>
  );
}

export function AddPersonForm({ orgs, canAddStaff }: { orgs: { id: string; name: string }[]; canAddStaff: boolean }) {
  const [state, action, pending] = useActionState<PersonState, FormData>(createPersonAction, {});

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-[#7fe3d4]/50 p-4">
      <h2 className="text-lg font-semibold">Add a person</h2>
      <Label htmlFor="name">Name</Label>
      <Input id="name" name="name" required className="h-12" />
      <Label htmlFor="email">Email</Label>
      <Input id="email" name="email" type="email" required className="h-12" />
      <Label htmlFor="role">Role</Label>
      <select id="role" name="role" className="h-12 rounded-md border bg-transparent px-3">
        <option value="CASE_MANAGER" className="text-black">
          Case manager or caregiver (sees approved clients&apos; mail)
        </option>
        <option value="ORG_ADMIN" className="text-black">
          Nonprofit admin (client list and invoices, no mail)
        </option>
        {canAddStaff && (
          <>
            <option value="STAFF" className="text-black">
              Shop staff
            </option>
            <option value="ADMIN" className="text-black">
              Admin
            </option>
          </>
        )}
      </select>
      <Label htmlFor="orgId">Nonprofit (needed for nonprofit admins)</Label>
      <select id="orgId" name="orgId" className="h-12 rounded-md border bg-transparent px-3">
        <option value="" className="text-black">
          None
        </option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id} className="text-black">
            {o.name}
          </option>
        ))}
      </select>
      {state.error && <p className="text-[#f48fb1]">{state.error}</p>}
      {state.created && (
        <div>
          <p className="text-[#7fe3d4]">
            Added {state.created.name} ({state.created.email}).
          </p>
          <TempPassword password={state.created.password} />
        </div>
      )}
      <Button type="submit" disabled={pending} className="h-12 bg-[#7fe3d4] text-[#1c1a1d] hover:bg-[#a6efe4]">
        {pending ? "Adding…" : "Add person"}
      </Button>
    </form>
  );
}

export function ResetPasswordButton({ userId, label = "Reset password" }: { userId: string; label?: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPasswordAction.bind(null, userId), {});
  if (state.password) return <TempPassword password={state.password} />;
  return (
    <form action={action}>
      {state.error && <p className="text-sm text-[#f48fb1]">{state.error}</p>}
      <button type="submit" disabled={pending} className="text-sm text-[#ffd166] underline">
        {pending ? "Resetting…" : label}
      </button>
    </form>
  );
}
