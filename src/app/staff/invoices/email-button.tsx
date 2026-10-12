"use client";

import { useActionState } from "react";
import { emailInvoiceAction, type EmailState } from "./actions";

export function EmailInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState<EmailState, FormData>(emailInvoiceAction.bind(null, invoiceId), {});
  return (
    <form action={action}>
      <button type="submit" disabled={pending} className="text-[#ffd166] underline">
        {pending ? "Emailing…" : "Email it"}
      </button>
      {state.ok && <span className="ml-2 text-[#7fe3d4]">{state.ok}</span>}
      {state.error && <span className="ml-2 text-[#f48fb1]">{state.error}</span>}
    </form>
  );
}
