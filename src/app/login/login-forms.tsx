"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clientLogin, staffLogin, type LoginState } from "./actions";

const field = "h-14 text-lg";

export function LoginForms({ defaultPmb = "" }: { defaultPmb?: string }) {
  const [mode, setMode] = useState<"client" | "staff">("client");
  // Controlled so a wrong-password retry keeps the email typed in.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientState, clientAction, clientPending] = useActionState<LoginState, FormData>(clientLogin, {});
  const [staffState, staffAction, staffPending] = useActionState<LoginState, FormData>(staffLogin, {});

  if (mode === "client") {
    return (
      <div className="flex flex-col gap-6">
        <form action={clientAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pmbNumber" className="text-base">
              Mailbox number
            </Label>
            <Input
              id="pmbNumber"
              name="pmbNumber"
              autoComplete="username"
              required
              defaultValue={defaultPmb}
              className={field}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pin" className="text-base">
              6-digit PIN
            </Label>
            <Input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="current-password"
              required
              className={field}
            />
          </div>
          {clientState.error && (
            <p role="alert" className="text-base text-[#f48fb1]">
              {clientState.error}
            </p>
          )}
          <Button type="submit" disabled={clientPending} className="h-14 bg-[#7fe3d4] text-lg text-[#1c1a1d] hover:bg-[#a6efe4]">
            {clientPending ? "Checking…" : "See my mail"}
          </Button>
        </form>
        <button type="button" onClick={() => setMode("staff")} className="text-base text-[#ffd166] underline">
          Case manager, nonprofit, or staff login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={staffAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-base">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-base">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </div>
        {staffState.error && (
          <p role="alert" className="text-base text-[#f48fb1]">
            {staffState.error}
          </p>
        )}
        <Button type="submit" disabled={staffPending} className="h-14 bg-[#7fe3d4] text-lg text-[#1c1a1d] hover:bg-[#a6efe4]">
          {staffPending ? "Checking…" : "Log in"}
        </Button>
      </form>
      <button type="button" onClick={() => setMode("client")} className="text-base text-[#ffd166] underline">
        Mailbox holder login
      </button>
    </div>
  );
}
