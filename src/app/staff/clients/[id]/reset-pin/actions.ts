"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { generatePin } from "@/lib/pin";
import { BCRYPT_ROUNDS } from "@/lib/security";
import { requireStaff } from "@/lib/session";

export type ResetState = { pin?: string; error?: string };

// Staff-only: make a new random PIN and unlock the account. The new PIN is
// shown once on screen to hand to the client; only its hash is stored.
export async function resetPin(clientId: string, _prev: ResetState): Promise<ResetState> {
  await requireStaff();
  const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return { error: "Client not found." };

  const pin = generatePin();
  await db.client.update({
    where: { id: clientId },
    data: { pinHash: await bcrypt.hash(pin, BCRYPT_ROUNDS), failedLogins: 0, lockedUntil: null },
  });
  return { pin };
}
