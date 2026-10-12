import { runNightlyBackup } from "@/lib/backup";

// Vercel Cron, nightly: back up the database to private storage.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await runNightlyBackup();
  return Response.json({ key: result.key, bytes: result.bytes, rows: result.rows, removed: result.removed });
}
