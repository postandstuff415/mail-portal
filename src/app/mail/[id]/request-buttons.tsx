"use client";

import type { RequestType } from "@prisma/client";
import { useState, useTransition } from "react";
import { requestAction, type ActionResult } from "./actions";

const BUTTONS: { type: RequestType; label: string; hint: string; style: string }[] = [
  { type: "OPEN_AND_SCAN", label: "Open and scan", hint: "Staff open it and add photos of the pages", style: "bg-[#7fe3d4] text-[#1c1a1d]" },
  { type: "PICKUP", label: "I'll pick it up", hint: "We'll have it ready at the counter", style: "bg-[#ffd166] text-[#1c1a1d]" },
  { type: "HOLD", label: "Hold", hint: "Keep it on the shelf for now", style: "border border-[#7fe3d4] text-[#7fe3d4]" },
  { type: "DISCARD", label: "Discard", hint: "Staff shred it", style: "border border-[#f48fb1] text-[#f48fb1]" },
];

// The four requests a client or their case manager can make on a piece of mail.
export function RequestButtons({ mailItemId, open }: { mailItemId: string; open: RequestType[] }) {
  const [result, setResult] = useState<ActionResult>({});
  const [pending, start] = useTransition();

  function ask(type: RequestType) {
    if (type === "DISCARD" && !window.confirm("Shred this mail? This can't be undone once staff do it.")) return;
    start(async () => setResult(await requestAction(mailItemId, type)));
  }

  return (
    <div className="flex flex-col gap-3">
      {result.ok && <p className="rounded-lg bg-[#7fe3d4] p-3 font-semibold text-[#1c1a1d]">{result.ok}</p>}
      {result.error && <p className="rounded-lg bg-[#f48fb1] p-3 font-semibold text-[#1c1a1d]">{result.error}</p>}
      {BUTTONS.map((b) => {
        const asked = open.includes(b.type);
        return (
          <button
            key={b.type}
            type="button"
            disabled={pending || asked}
            onClick={() => ask(b.type)}
            className={`flex min-h-14 flex-col items-center justify-center rounded-lg px-4 py-2 text-lg font-semibold disabled:opacity-60 ${b.style}`}
          >
            {asked ? `${b.label} — asked ✓` : b.label}
            <span className="text-sm font-normal opacity-80">{b.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
