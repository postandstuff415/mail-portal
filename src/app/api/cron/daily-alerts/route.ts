import { ALERT_HOUR_PACIFIC, pacificHour, sendDailyAlerts } from "@/lib/alerts";

// Called by Vercel Cron at 00:00 and 01:00 UTC. Only the run that lands at
// 5 pm Pacific sends, so it's right in both daylight and standard time.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  if (pacificHour(now) !== ALERT_HOUR_PACIFIC) {
    return Response.json({ skipped: true, reason: "not 5 pm Pacific" });
  }
  return Response.json(await sendDailyAlerts(now));
}
