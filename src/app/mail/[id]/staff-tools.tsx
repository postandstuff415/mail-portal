"use client";

import { useState, useTransition } from "react";
import { compressPhoto } from "@/lib/compress-photo";
import { closeOutAction, pickedUpAction, uploadContentsAction, type ActionResult } from "./actions";

// Staff view of a piece of mail: add page photos after opening, record pickup,
// or record that it was returned/shredded.
export function StaffTools({ mailItemId, closed }: { mailItemId: string; closed: boolean }) {
  const [result, setResult] = useState<ActionResult>({});
  const [pending, start] = useTransition();
  const [shrinking, setShrinking] = useState(false);

  async function onPage(file: File | undefined) {
    if (!file) return;
    setShrinking(true);
    let small: File;
    try {
      small = await compressPhoto(file, "page.jpg");
    } finally {
      setShrinking(false);
    }
    const data = new FormData();
    data.set("photo", small);
    start(async () => setResult(await uploadContentsAction(mailItemId, data)));
  }

  function run(action: () => Promise<ActionResult>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => setResult(await action()));
  }

  if (closed) return <p className="opacity-80">This mail has left the shop.</p>;

  return (
    <div className="flex flex-col gap-3">
      {result.ok && <p className="rounded-lg bg-[#7fe3d4] p-3 font-semibold text-[#1c1a1d]">{result.ok}</p>}
      {result.error && <p className="rounded-lg bg-[#f48fb1] p-3 font-semibold text-[#1c1a1d]">{result.error}</p>}
      <label className="flex h-14 cursor-pointer items-center justify-center rounded-md bg-[#7fe3d4] text-lg font-semibold text-[#1c1a1d]">
        {shrinking ? "Shrinking photo…" : pending ? "Working…" : "Add photo of a page inside"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={pending || shrinking}
          onChange={(e) => {
            void onPage(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => pickedUpAction(mailItemId), "Client showed ID and took this mail?")}
        className="h-14 rounded-md bg-[#ffd166] text-lg font-semibold text-[#1c1a1d]"
      >
        Picked up (ID checked)
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => closeOutAction(mailItemId, "RETURNED"), "Mark returned to sender?")}
          className="h-12 rounded-md border border-[#7fe3d4] text-[#7fe3d4]"
        >
          Returned to sender
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => closeOutAction(mailItemId, "SHREDDED"), "Mark shredded?")}
          className="h-12 rounded-md border border-[#f48fb1] text-[#f48fb1]"
        >
          Shredded
        </button>
      </div>
    </div>
  );
}
