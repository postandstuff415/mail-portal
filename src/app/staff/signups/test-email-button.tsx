"use client";

import { useActionState } from "react";
import { testEmailAction, type TestEmailState } from "./actions";

// Sends a sample sign-up alert so staff can check that email works.
export function TestEmailButton() {
  const [state, action, pending] = useActionState<TestEmailState, FormData>(testEmailAction, {});
  return (
    <form action={action} className="mt-8 border-t border-white/10 pt-4 text-sm print:hidden">
      <button type="submit" disabled={pending} className="text-[#ffd166] underline">
        {pending ? "Sending…" : "Send a test sign-up email"}
      </button>
      {state.ok && <span className="ml-2 text-[#7fe3d4]">{state.ok}</span>}
      {state.error && <span className="ml-2 text-[#f48fb1]">{state.error}</span>}
    </form>
  );
}
