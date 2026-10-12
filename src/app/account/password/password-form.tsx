"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction, type PasswordState } from "./actions";

export function PasswordForm({ currentLabel }: { currentLabel: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <Label htmlFor="current">{currentLabel}</Label>
      <Input id="current" name="current" type="password" autoComplete="current-password" required className="h-12" />
      <Label htmlFor="next">New password (12+ characters)</Label>
      <Input id="next" name="next" type="password" autoComplete="new-password" minLength={12} required className="h-12" />
      <Label htmlFor="confirm">New password again</Label>
      <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required className="h-12" />
      {state.error && <p className="text-[#f48fb1]">{state.error}</p>}
      <Button type="submit" disabled={pending} className="h-12 bg-[#7fe3d4] text-[#1c1a1d] hover:bg-[#a6efe4]">
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
