"use client";

import imageCompression from "browser-image-compression";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupClient, saveMail, type LookupResult } from "./actions";
import { pmbFromScan, QrScanner } from "./qr-scanner";

type MailType = "LETTER" | "FLAT" | "PACKAGE";

export function ReceiveForm() {
  const [pmb, setPmb] = useState("");
  const [client, setClient] = useState<LookupResult>();
  const [scanning, setScanning] = useState(false);
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [type, setType] = useState<MailType>("LETTER");
  const [urgent, setUrgent] = useState(false);
  const [shelf, setShelf] = useState("");
  const [sender, setSender] = useState("");
  const [message, setMessage] = useState<{ ok?: string; error?: string }>({});
  const [compressing, setCompressing] = useState(false);
  const [saving, startSaving] = useTransition();

  // Free the old preview image's memory when it's replaced.
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const findClient = useCallback(async (value: string) => {
    const v = value.trim();
    setPmb(v.toUpperCase());
    setClient(v ? await lookupClient(v) : undefined);
  }, []);

  const onScan = useCallback(
    (text: string) => {
      setScanning(false);
      void findClient(pmbFromScan(text));
    },
    [findClient],
  );

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setCompressing(true);
    try {
      // Shrink a multi-megabyte phone photo to about 150 KB before upload.
      const small = await imageCompression(file, {
        maxSizeMB: 0.15,
        maxWidthOrHeight: 1600,
        fileType: "image/jpeg",
        initialQuality: 0.8,
        useWebWorker: true,
      });
      setPhoto(new File([small], "envelope.jpg", { type: "image/jpeg" }));
      setPreview(URL.createObjectURL(small));
    } finally {
      setCompressing(false);
    }
  }

  function save() {
    if (!photo || !client?.pmbNumber) return;
    const data = new FormData();
    data.set("pmbNumber", client.pmbNumber);
    data.set("photo", photo);
    data.set("type", type);
    if (urgent) data.set("urgent", "on");
    data.set("shelfLocation", shelf);
    data.set("sender", sender);
    startSaving(async () => {
      const result = await saveMail(data);
      setMessage(result);
      if (result.ok) {
        // Ready for the next piece; keep the client and shelf for a stack of mail.
        setPhoto(undefined);
        setPreview(undefined);
        setUrgent(false);
        setSender("");
        setType("LETTER");
      }
    });
  }

  const canSave = !!photo && !!client?.pmbNumber && !client.warning && !saving && !compressing;

  return (
    <div className="flex flex-col gap-5">
      {message.ok && <p className="rounded-lg bg-[#7fe3d4] p-3 font-semibold text-[#1c1a1d]">✓ {message.ok}</p>}
      {message.error && <p className="rounded-lg bg-[#f48fb1] p-3 font-semibold text-[#1c1a1d]">{message.error}</p>}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">1. Whose mail?</h2>
        {scanning ? (
          <QrScanner onScan={onScan} onClose={() => setScanning(false)} />
        ) : (
          <>
            <Button type="button" onClick={() => setScanning(true)} className="h-14 bg-[#ffd166] text-lg text-[#1c1a1d]">
              Scan client QR
            </Button>
            <div className="flex gap-2">
              <Input
                aria-label="Mailbox number"
                placeholder="or type mailbox #"
                value={pmb}
                onChange={(e) => setPmb(e.target.value.toUpperCase())}
                onBlur={(e) => void findClient(e.target.value)}
                className="h-12 uppercase"
              />
              <Button type="button" variant="outline" onClick={() => void findClient(pmb)} className="h-12 bg-transparent">
                Find
              </Button>
            </div>
          </>
        )}
        {client?.error && <p className="text-[#f48fb1]">{client.error}</p>}
        {client?.name && (
          <p className="text-lg">
            <strong>{client.name}</strong> · {client.pmbNumber}
            {client.warning && <span className="block text-[#f48fb1]">{client.warning}</span>}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">2. Photo of the envelope</h2>
        <label className="flex h-14 cursor-pointer items-center justify-center rounded-md bg-[#7fe3d4] text-lg font-semibold text-[#1c1a1d]">
          {compressing ? "Shrinking photo…" : photo ? "Retake photo" : "Take photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img src={preview} alt="Envelope preview" className="max-h-64 rounded-lg object-contain" />}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">3. Details</h2>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["LETTER", "Letter"],
              ["FLAT", "Large env."],
              ["PACKAGE", "Package"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`h-12 rounded-md border ${type === value ? "border-[#ffd166] bg-[#ffd166] text-[#1c1a1d]" : "border-[#7fe3d4]/60"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-lg">
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="size-6" />
          Urgent (court, SSA, CalFresh, Medi-Cal, DMV)
        </label>
        <Label htmlFor="shelf">Shelf location</Label>
        <Input id="shelf" value={shelf} onChange={(e) => setShelf(e.target.value)} className="h-12" />
        <Label htmlFor="sender">Sender (optional, from the envelope)</Label>
        <Input id="sender" value={sender} onChange={(e) => setSender(e.target.value)} className="h-12" />
      </section>

      <Button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="h-16 bg-[#7fe3d4] text-xl font-bold text-[#1c1a1d] hover:bg-[#a6efe4]"
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
