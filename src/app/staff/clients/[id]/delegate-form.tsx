"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { addDelegateAction, type DelegateState } from "./actions";

export function DelegateForm({
  clientId,
  caseManagers,
}: {
  clientId: string;
  caseManagers: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<DelegateState, FormData>(addDelegateAction.bind(null, clientId), {});

  if (caseManagers.length === 0) {
    return (
      <p className="opacity-80">
        No case manager accounts yet. Add one under <a href="/staff/people" className="text-[#ffd166] underline">People</a>.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <select name="userId" required className="h-12 rounded-md border bg-transparent px-3">
        {caseManagers.map((u) => (
          <option key={u.id} value={u.id} className="text-black">
            {u.label}
          </option>
        ))}
      </select>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="consent" className="mt-1 size-6 shrink-0" />
        The client signed consent for this person to see their mail.
      </label>
      {state.error && <p className="text-[#f48fb1]">{state.error}</p>}
      {state.ok && <p className="text-[#7fe3d4]">{state.ok}</p>}
      <Button type="submit" disabled={pending} className="h-12 bg-[#7fe3d4] text-[#1c1a1d] hover:bg-[#a6efe4]">
        {pending ? "Adding…" : "Give access"}
      </Button>
    </form>
  );
}
