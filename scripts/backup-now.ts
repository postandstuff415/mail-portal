// Run a database backup right now (same as the nightly job).
// Usage: npx dotenv -e <env file> -- tsx scripts/backup-now.ts
import { runNightlyBackup } from "../src/lib/backup";
import { db } from "../src/lib/db";

runNightlyBackup()
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
