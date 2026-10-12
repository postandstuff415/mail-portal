import twilio from "twilio";

// Texts go through Twilio once it's configured. Until then they are only
// printed to the server log, so nothing is sent by accident.
//
// Auth: a project-specific API key (TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET)
// is preferred over the account's main auth token, so it can be revoked alone.
// Sender: the A2P 10DLC Messaging Service if set, else a single phone number.

export type SmsSender = (to: string, body: string) => Promise<void>;

function twilioClient() {
  const e = process.env;
  if (!e.TWILIO_ACCOUNT_SID) return null;
  if (e.TWILIO_API_KEY_SID && e.TWILIO_API_KEY_SECRET) {
    return twilio(e.TWILIO_API_KEY_SID, e.TWILIO_API_KEY_SECRET, { accountSid: e.TWILIO_ACCOUNT_SID });
  }
  if (e.TWILIO_AUTH_TOKEN) return twilio(e.TWILIO_ACCOUNT_SID, e.TWILIO_AUTH_TOKEN);
  return null;
}

function senderFields(): { messagingServiceSid: string } | { from: string } | null {
  const e = process.env;
  if (e.TWILIO_MESSAGING_SERVICE_SID) return { messagingServiceSid: e.TWILIO_MESSAGING_SERVICE_SID };
  if (e.TWILIO_FROM_NUMBER) return { from: e.TWILIO_FROM_NUMBER };
  return null;
}

export function smsConfigured(): boolean {
  return process.env.SMS_LIVE === "true" && twilioClient() !== null && senderFields() !== null;
}

export const sendSms: SmsSender = async (to, body) => {
  if (!smsConfigured()) {
    console.log(`[sms dry run] to ${to.slice(0, -4).replace(/\d/g, "•")}${to.slice(-4)}: ${body}`);
    return;
  }
  await twilioClient()!.messages.create({ to, body, ...senderFields()! });
};
