// Create (or reset the password of) an ADMIN account from a local, git-ignored
// file, so the password is never typed into chat or a command line.
//
//   1. Put ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD in .env.admin
//   2. Run against a database:  npx dotenv -e <db env file> -- tsx scripts/create-admin.ts
//   3. Delete .env.admin afterwards.
//
// The admin sets up 2-step codes on first login.
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function readAdminFile() {
  const values: Record<string, string> = {};
  for (const line of readFileSync(".env.admin", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) values[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return values;
}

async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = readAdminFile();
  const email = (ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("ADMIN_EMAIL is missing or not an email address.");
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");

  const db = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      // Resetting clears 2-step codes too, so the owner can re-enroll a new phone.
      await db.user.update({
        where: { email },
        data: { passwordHash, role: "ADMIN", twoFactorSecret: null, failedLogins: 0, lockedUntil: null },
      });
      console.log(`Reset password for existing account ${email} on branch ${process.env.NEON_BRANCH ?? "?"}.`);
    } else {
      await db.user.create({ data: { email, name: ADMIN_NAME?.trim() || null, passwordHash, role: "ADMIN" } });
      console.log(`Created ADMIN account ${email} on branch ${process.env.NEON_BRANCH ?? "?"}.`);
    }
    console.log("Next: log in at /login (staff login), then scan the 2-step QR code with your phone.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
