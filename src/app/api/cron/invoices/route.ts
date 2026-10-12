import { generateMonthlyInvoices } from "@/lib/billing";

// Vercel Cron, on the 1st of each month: last month's invoices for every
// nonprofit. Running it again does nothing (invoices are never duplicated).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await generateMonthlyInvoices());
}
