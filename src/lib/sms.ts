import twilio from "twilio";

// Texts go through Twilio once it's configured. Until then they are only
// printed to the server log, so nothing is sent by accident.

export type SmsSender = (to: string, body: string) => Promise<void>;

export function smsConfigured(): boolean {
  const e = process.env;
  return !!(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN && e.TWILIO_FROM_NUMBER);
}

export const sendSms: SmsSender = async (to, body) => {
  if (!smsConfigured()) {
    console.log(`[sms dry run] to ${to.slice(0, -4).replace(/\d/g, "•")}${to.slice(-4)}: ${body}`);
    return;
  }
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({ to, from: process.env.TWILIO_FROM_NUMBER, body });
};
