"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmTwoFactor, type TwoFactorState } from "./actions";

export function TwoFactorSetupForm({ secret }: { secret: string }) {
  const [state, action, pending] = useActionState<TwoFactorState, FormData>(confirmTwoFactor, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="secret" value={secret} />
      <Label htmlFor="code" className="text-base">
        6-digit code from the app
      </Label>
      <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required className="h-14 text-lg" />
      {state.error && <p className="text-[#f48fb1]">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-14 bg-[#7fe3d4] text-lg text-[#1c1a1d] hover:bg-[#a6efe4]">
        {pending ? "Checking…" : "Turn on 2-step codes"}
      </Button>
    </form>
  );
}
