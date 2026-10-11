import { randomInt } from "node:crypto";

// Random 6-digit PIN, e.g. "048213". Shown once to staff, stored only as a hash.
export function generatePin(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function normalizePmb(pmb: string): string {
  return pmb.trim().toUpperCase();
}
