// Read-only Twilio check: keys work, account type, sender number, and A2P 10DLC
// registration status. Sends nothing. Run with: npm run twilio:check
import twilio from "twilio";

async function main() {
  const e = process.env;
  if (!e.TWILIO_ACCOUNT_SID || !e.TWILIO_API_KEY_SID || !e.TWILIO_API_KEY_SECRET) {
    throw new Error("Fill in TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET in .env.local first.");
  }
  const client = twilio(e.TWILIO_API_KEY_SID, e.TWILIO_API_KEY_SECRET, { accountSid: e.TWILIO_ACCOUNT_SID });

  // Standard API keys may not read the account record itself; that's fine.
  try {
    const account = await client.api.v2010.accounts(e.TWILIO_ACCOUNT_SID).fetch();
    console.log(`Account "${account.friendlyName}": status ${account.status}, type ${account.type}`);
  } catch (error) {
    console.log(`(Account details not readable with this key: ${error instanceof Error ? error.message : error})`);
  }

  const numbers = await client.incomingPhoneNumbers.list({ limit: 50 });
  console.log(`\nPhone numbers on the account (${numbers.length}):`);
  for (const n of numbers) {
    const caps = Object.entries(n.capabilities ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ");
    const mine = n.phoneNumber === e.TWILIO_FROM_NUMBER ? "  <- TWILIO_FROM_NUMBER" : "";
    console.log(`  ${n.phoneNumber} "${n.friendlyName}" [${caps}]${mine}`);
  }
  if (e.TWILIO_FROM_NUMBER && !numbers.some((n) => n.phoneNumber === e.TWILIO_FROM_NUMBER)) {
    console.log(`  !! TWILIO_FROM_NUMBER is not a number on this account`);
  }

  const services = await client.messaging.v1.services.list({ limit: 50 });
  console.log(`\nMessaging Services (${services.length}):`);
  for (const s of services) {
    const senders = await client.messaging.v1.services(s.sid).phoneNumbers.list({ limit: 20 });
    console.log(`  ${s.sid} "${s.friendlyName}" numbers: ${senders.map((p) => p.phoneNumber).join(", ") || "none"}`);
    const campaigns = await client.messaging.v1.services(s.sid).usAppToPerson.list({ limit: 20 });
    for (const c of campaigns) {
      console.log(`     campaign ${c.sid} use case ${c.usAppToPersonUsecase}: ${c.campaignStatus}`);
    }
  }

  const brands = await client.messaging.v1.brandRegistrations.list({ limit: 20 });
  console.log(`\nA2P 10DLC brands (${brands.length}):`);
  for (const b of brands) {
    console.log(`  ${b.sid} type ${b.brandType}: ${b.status}${b.failureReason ? ` (${b.failureReason})` : ""}`);
  }
}

main().catch((error) => {
  console.error("Twilio check failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
