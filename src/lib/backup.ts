import { gunzipSync, gzipSync } from "node:zlib";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { deleteObject, getObjectBytes, listKeys, putObject } from "@/lib/storage";

// Nightly database backup: every table as JSON, gzipped, in the private storage
// bucket under backups/. Neon itself can only rewind 6 hours, so these cover
// mistakes found later. Kept 30 days. Mail photos already live in storage.

export const BACKUP_PREFIX = "backups/";
const KEEP_DAYS = 30;

// Parents before children, so a restore never breaks a foreign key.
export const TABLES = [
  "organization",
  "user",
  "client",
  "application",
  "delegate",
  "mailItem",
  "mailImage",
  "request",
  "pickup",
  "auditLog",
  "invoice",
  "invoiceLine",
] as const;
type Table = (typeof TABLES)[number];

export type Backup = { createdAt: string; branch: string | null; tables: Record<Table, unknown[]> };

type Delegate = { findMany(): Promise<unknown[]>; createMany(args: { data: unknown[] }): Promise<unknown>; count(): Promise<number> };
const model = (client: PrismaClient, t: Table) => client[t] as unknown as Delegate;

export async function exportDatabase(client: PrismaClient = db): Promise<Backup> {
  const tables = {} as Record<Table, unknown[]>;
  for (const t of TABLES) tables[t] = await model(client, t).findMany();
  return { createdAt: new Date().toISOString(), branch: process.env.NEON_BRANCH ?? null, tables };
}

export function encodeBackup(backup: Backup): Uint8Array {
  // Decimals become strings; dates become ISO strings (JSON default).
  return gzipSync(JSON.stringify(backup, (_k, v) => (v instanceof Prisma.Decimal ? v.toString() : v)));
}

export function decodeBackup(bytes: Uint8Array): Backup {
  return JSON.parse(gunzipSync(bytes).toString("utf8")) as Backup;
}

export async function runNightlyBackup(now = new Date()) {
  const backup = await exportDatabase();
  const key = `${BACKUP_PREFIX}${now.toISOString().replaceAll(":", "-").slice(0, 19)}Z.json.gz`;
  const bytes = encodeBackup(backup);
  await putObject(key, bytes, "application/gzip");

  // Drop backups older than 30 days (the date is in the file name).
  const cutoff = now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const k of await listKeys(BACKUP_PREFIX)) {
    const when = Date.parse(k.slice(BACKUP_PREFIX.length, BACKUP_PREFIX.length + 10));
    if (!Number.isNaN(when) && when < cutoff) {
      await deleteObject(k);
      removed++;
    }
  }
  const rows = Object.fromEntries(TABLES.map((t) => [t, backup.tables[t].length]));
  return { key, bytes: bytes.length, rows, removed };
}

export async function readBackup(key: string): Promise<Backup> {
  return decodeBackup(await getObjectBytes(key));
}

// Load a backup into an EMPTY database (a fresh Neon branch). Refuses to touch a
// database that already has data, so it can never overwrite the live site.
export async function restoreDatabase(client: PrismaClient, backup: Backup) {
  for (const t of TABLES) {
    if ((await model(client, t).count()) > 0) {
      throw new Error(`Refusing to restore: table ${t} is not empty. Restore into a fresh, empty branch.`);
    }
  }
  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    const rows = backup.tables[t] ?? [];
    for (let i = 0; i < rows.length; i += 500) await model(client, t).createMany({ data: rows.slice(i, i + 500) });
    counts[t] = rows.length;
  }
  return counts;
}
