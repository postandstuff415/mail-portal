// Exact text-alert agreement printed on the paper intake form and shown on
// /sms-terms, so carriers and clients see the same words. Change both together.
export const SMS_CONSENT_TEXT =
  "I agree to receive mail alert text messages from Post and Stuff at the mobile number I provided. " +
  "Up to 1 message per day when mail arrives. Message and data rates may apply. " +
  "Reply STOP to cancel, HELP for help. Consent is not required to use the mailbox service.";

// Sent once when staff record a signed agreement (carriers require an opt-in confirmation).
export const SMS_WELCOME_TEXT =
  "Post and Stuff: you're signed up for mail alerts. Up to 1 msg/day when mail arrives. " +
  "Msg & data rates may apply. Reply HELP for help, STOP to cancel.";

// Replies configured in the Twilio Messaging Service (Opt-Out Management).
export const SMS_HELP_TEXT =
  "Post and Stuff Mail Alerts: call (415) 725-1603 or visit postandstuff.com. Up to 1 msg/day. " +
  "Msg & data rates may apply. Reply STOP to cancel.";
export const SMS_STOP_TEXT =
  "Post and Stuff: you're unsubscribed from mail alerts and won't get more texts. Reply START to resubscribe.";
