// Registers the A2P 10DLC "Post and Stuff Mail Alerts" campaign (owner approved
// 2026-10-12, including Twilio's fees). Wording = docs/twilio-campaign.md and
// src/lib/sms-consent.ts. Refuses to run if the service already has a campaign.
// Run: npx dotenv -e .env.local -- tsx scripts/twilio-register-campaign.ts
import twilio from "twilio";
import { SMS_CONSENT_TEXT, SMS_HELP_TEXT, SMS_STOP_TEXT, SMS_WELCOME_TEXT } from "../src/lib/sms-consent";
import { alertMessage } from "../src/lib/alerts";

const BRAND = "BN59137a8947a7dd803a22c1a25fdb979b"; // Post and Stuff, approved
const SERVICE_NAME = "Post and Stuff Mail Alerts";

async function main() {
  const e = process.env;
  const serviceSid = e.TWILIO_MESSAGING_SERVICE_SID;
  if (!serviceSid) throw new Error("TWILIO_MESSAGING_SERVICE_SID is not set.");
  const client = twilio(e.TWILIO_API_KEY_SID!, e.TWILIO_API_KEY_SECRET!, { accountSid: e.TWILIO_ACCOUNT_SID! });

  const existing = await client.messaging.v1.services(serviceSid).usAppToPerson.list({ limit: 5 });
  if (existing.length > 0) {
    for (const c of existing) console.log(`Already registered: ${c.sid} ${c.usAppToPersonUsecase} ${c.campaignStatus}`);
    return;
  }

  const service = await client.messaging.v1.services(serviceSid).update({ friendlyName: SERVICE_NAME });
  console.log(`Messaging Service renamed: "${service.friendlyName}"`);

  const campaign = await client.messaging.v1.services(serviceSid).usAppToPerson.create({
    brandRegistrationSid: BRAND,
    usAppToPersonUsecase: "ACCOUNT_NOTIFICATION",
    description:
      "Post and Stuff is a commercial mail receiving agency (CMRA) in Oakland, CA. Many of our mailbox clients are " +
      "referred by partner nonprofits. This campaign sends account notifications to mailbox clients who opted in, " +
      "telling them that new mail has arrived in their mailbox. We send at most one message per day, only on days mail " +
      "arrives, stating only the number of pieces received. Messages never include the sender or the contents of the " +
      "mail and are never marketing or promotional.",
    messageFlow:
      "Clients sign up online at https://postandstuff.com/signup (usually with their case manager), where text alerts " +
      "are a separate, optional, unchecked checkbox next to the full program terms; the sign-up is signed by typing the " +
      "client's name and is stored with the date and time. Clients can also sign up on paper at our shop, 4051 Foothill " +
      "Blvd, Oakland, CA 94601, where the form has the same optional checkbox, signed and dated. The wording is: \"" +
      SMS_CONSENT_TEXT +
      "\" The full program terms are published at https://postandstuff.com/sms-terms, and our privacy policy is at " +
      "https://postandstuff.com/privacy. After sign-up the client receives a confirmation text with frequency, rates, " +
      "HELP and STOP instructions.",
    messageSamples: [alertMessage(2), alertMessage(1), SMS_WELCOME_TEXT],
    hasEmbeddedLinks: true,
    hasEmbeddedPhone: false,
    ageGated: false,
    directLending: false,
    subscriberOptIn: true,
    optInKeywords: ["START"],
    optInMessage: SMS_WELCOME_TEXT,
    optOutKeywords: ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"],
    optOutMessage: SMS_STOP_TEXT,
    helpKeywords: ["HELP", "INFO"],
    helpMessage: SMS_HELP_TEXT,
    privacyPolicyUrl: "https://postandstuff.com/privacy",
    termsAndConditionsUrl: "https://postandstuff.com/sms-terms",
  });
  console.log(`Campaign submitted: ${campaign.sid} use case ${campaign.usAppToPersonUsecase}, status ${campaign.campaignStatus}`);
}

main().catch((err) => {
  console.error("Registration failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
