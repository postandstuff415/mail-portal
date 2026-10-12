"use client";

import imageCompression from "browser-image-compression";

// Shrink a multi-megabyte phone photo to about 150 KB before upload.
export async function compressPhoto(file: File, name = "photo.jpg"): Promise<File> {
  const small = await imageCompression(file, {
    maxSizeMB: 0.15,
    maxWidthOrHeight: 1600,
    fileType: "image/jpeg",
    initialQuality: 0.8,
    useWebWorker: true,
  });
  return new File([small], name, { type: "image/jpeg" });
}
