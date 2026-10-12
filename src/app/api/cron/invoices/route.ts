import { generateMonthlyInvoices } from "@/lib/billing";
import { emailDraftInvoices } from "@/lib/invoice-email";

// Vercel Cron, on the 1st of each month: last month's invoices for every
// nonprofit, then email them. Running it again never duplicates invoices, and
// only drafts (never emailed) get emailed.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const generated = await generateMonthlyInvoices();
  const emailed = await emailDraftInvoices(generated.month);
  return Response.json({ ...generated, emailed });
}
