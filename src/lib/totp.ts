import { generateSecret, generateURI, verify } from "otplib";

// 2-step codes for STAFF and ADMIN, compatible with Google Authenticator, Authy, etc.

export function newTotpSecret(): string {
  return generateSecret();
}

export function totpUri(secret: string, email: string): string {
  return generateURI({ issuer: "Post and Stuff Mail", label: email, secret });
}

export async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const token = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  // Accept the previous/next 30-second window to allow for clock drift.
  const result = await verify({ secret, token, epochTolerance: 30 });
  return result.valid;
}
