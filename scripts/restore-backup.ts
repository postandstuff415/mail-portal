// Restore a backup into an EMPTY database, e.g. a fresh Neon branch:
//   1. neon branches create --name restore --schema-only   (empty tables)
//   2. Point RESTORE_DATABASE_URL at that branch, keep the storage keys of the
//      branch the backup was taken from, and run:
//      npx dotenv -e <env file> -- tsx scripts/restore-backup.ts backups/<file>.json.gz
// It refuses to write into a database that already has data.
import { PrismaClient } from "@prisma/client";
import { readBackup, restoreDatabase, TABLES } from "../src/lib/backup";

async function main() {
  const key = process.argv[2];
  const target = process.env.RESTORE_DATABASE_URL;
  if (!key || !target) throw new Error("Usage: RESTORE_DATABASE_URL=... tsx scripts/restore-backup.ts backups/<file>.json.gz");
  const backup = await readBackup(key);
  console.log(`Backup from ${backup.createdAt} (branch ${backup.branch ?? "?"})`);
  const client = new PrismaClient({ datasources: { db: { url: target } } });
  try {
    const counts = await restoreDatabase(client, backup);
    for (const t of TABLES) console.log(`  ${t}: ${counts[t]} rows`);
    console.log("Restore complete.");
  } finally {
    await client.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
