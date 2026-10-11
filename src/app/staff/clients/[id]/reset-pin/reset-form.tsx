"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { resetPin, type ResetState } from "./actions";

export function ResetPinForm({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPin.bind(null, clientId), {});

  if (state.pin) {
    return (
      <div className="rounded-xl border-2 border-[#ffd166] p-6 text-center">
        <p className="text-lg">New PIN (shown once — give it to the client now):</p>
        <p className="mt-2 font-mono text-5xl tracking-widest text-[#ffd166]">{state.pin}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && <p className="text-[#f48fb1]">{state.error}</p>}
      <p>Only do this with the client in front of you and their ID checked.</p>
      <Button type="submit" disabled={pending} className="h-14 bg-[#7fe3d4] text-lg text-[#1c1a1d] hover:bg-[#a6efe4]">
        {pending ? "Resetting…" : "Make a new PIN"}
      </Button>
    </form>
  );
}
