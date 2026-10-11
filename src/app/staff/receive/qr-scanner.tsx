"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

// Reads a client's QR code with the phone's back camera.
export function QrScanner({ onScan, onClose }: { onScan: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let stream: MediaStream | undefined;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code?.data) {
          onScan(code.data);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
        }
        frame = requestAnimationFrame(tick);
      })
      .catch(() => setError("Couldn't open the camera. Allow camera access, or type the mailbox number."));

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p className="text-[#f48fb1]">{error}</p>
      ) : (
        <video ref={videoRef} playsInline muted className="aspect-square w-full rounded-xl bg-black object-cover" />
      )}
      <button type="button" onClick={onClose} className="h-12 rounded-md border border-[#ffd166] text-[#ffd166]">
        Cancel scan
      </button>
    </div>
  );
}

// A scanned code is either a login link (…/login?pmb=T101) or just the number.
export function pmbFromScan(text: string): string {
  try {
    const pmb = new URL(text).searchParams.get("pmb");
    if (pmb) return pmb;
  } catch {
    // not a URL
  }
  return text.trim();
}
