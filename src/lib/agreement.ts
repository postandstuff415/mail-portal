// The Client Mailbox Agreement shown online at /agreement and /signup.
// Same wording as the lawyer-reviewed Claude Doc "Post and Stuff Client Mailbox
// Agreement" (2026-10-12). NEVER edit a published version in place: add a new
// version and point CURRENT_AGREEMENT at it, so every saved signature keeps
// pointing at the exact words that person agreed to.
import { SMS_CONSENT_TEXT } from "@/lib/sms-consent";

// Rendered in this order: paragraphs, numbered, bullets, closing.
export type AgreementSection = {
  heading: string;
  paragraphs?: string[];
  numbered?: string[];
  bullets?: string[];
  closing?: string[];
};

export type Agreement = { version: string; title: string; intro: string; sections: AgreementSection[] };

const V_2026_10_12: Agreement = {
  version: "2026-10-12",
  title: "Post and Stuff Client Mailbox Agreement",
  intro:
    "This agreement is between Post and Stuff, 4051 Foothill Blvd, Oakland, CA 94604, (415) 725-1603, and the mailbox client signing below.",
  sections: [
    {
      heading: "1. Your mailbox",
      paragraphs: [
        "Post and Stuff gives you a mailing address you can use for benefits, court, jobs, banks, and family. Write your address exactly like this: Your Name, 4051 Foothill Blvd, PMB (your number), Oakland, CA 94604.",
        'USPS rules say the "PMB" and your number must be on every piece of mail.',
        "What we accept: letters, large envelopes, and packages that fit through our door. We can refuse anything unsafe, illegal, or too big to store.",
        "What we do when mail arrives:",
      ],
      numbered: [
        "We photograph the outside of each piece (the envelope or package label) and put the photo in your private online mailbox.",
        "We put the mail on a shelf for you.",
        "We open and scan what is inside only if you or your approved case manager asks.",
      ],
      closing: ["We never read your mail beyond what is needed to scan it."],
    },
    {
      heading: "2. USPS Form 1583 and your ID",
      paragraphs: [
        "The Postal Service requires every mailbox client to sign PS Form 1583 and show two forms of ID before we can accept their mail. One must have a photo.",
      ],
      bullets: [
        "We witness your signature in person at the shop (or on a live video call, which USPS allows). There is no fee.",
        "We keep a copy of the form and your IDs, and we report it to the Postal Service as the law requires.",
        "Tell us when your ID expires or changes. Expired ID on file can stop us from accepting your mail until you update it.",
        "Until your 1583 is complete, we must return your mail to the sender.",
      ],
    },
    {
      heading: "3. Seeing your mail online",
      bullets: [
        "Log in at postandstuff.com with your mailbox number and a 6-digit PIN. We give you the PIN on your sign-up card.",
        "Keep your PIN private. Anyone with your mailbox number and PIN can see your mail. If someone else learns it, ask us for a new one right away.",
        "If you forget your PIN, come to the shop with ID and we will make a new one.",
        "We keep a record of every time someone looks at your mail. You can ask to see who looked.",
        "How we protect your information is explained in our privacy policy at postandstuff.com/privacy.",
      ],
      closing: [
        "You never pay for this mailbox. Your nonprofit pays Post and Stuff for it. If you stop working with that nonprofit, tell us; we will help you find another sponsor or close the mailbox.",
      ],
    },
    {
      heading: "4. Holding your mail and picking it up",
      bullets: [
        "We hold each piece of mail for 90 days from the day it arrives.",
        "Pick up mail during shop hours. Bring a photo ID. We record each pickup.",
        "Only you can pick up your mail, unless you give us written permission naming another person. That person must show their own ID.",
        "From your online mailbox you can ask us to: open and scan a letter, hold it, get it ready for pickup, or discard it.",
        "After the hold period ends, we either return the mail to the sender or shred it securely. We do not keep or sell anything.",
        "If you ask us to discard a piece of mail, we shred it. This cannot be undone.",
      ],
    },
    {
      heading: "5. Text alerts (optional)",
      paragraphs: [
        "Text alerts only say how many pieces of mail arrived. They never say who sent it or what it says. You do not need text alerts to use your mailbox. Full terms are at postandstuff.com/sms-terms.",
        SMS_CONSENT_TEXT,
      ],
    },
    {
      heading: "6. People who can see my mail (optional)",
      paragraphs: [
        "You can let a case manager or caregiver see your mail online and ask us to act on it for you. They see the same things you see. Our staff can always see your mail to do their job. Your nonprofit's office staff see only that you are enrolled, not your mail.",
        "To remove someone, tell us at the shop or call (415) 725-1603. We remove their access the same day. Your online mailbox shows who can see your mail.",
      ],
    },
    {
      heading: "7. Closing your mailbox",
      bullets: [
        "You can close your mailbox at any time by telling us. We can close it with 30 days' notice, or right away if the mailbox is used for anything illegal or if your 1583 or ID can no longer be kept current.",
        "Your nonprofit may also stop sponsoring your mailbox. We will tell you and give you time to pick up your mail.",
        "After your mailbox closes, we handle new mail the way USPS rules require, which usually means returning it to the sender. Pick up any mail still on the shelf within 30 days.",
        "We keep your 1583 and records for as long as USPS requires.",
      ],
    },
    {
      heading: "8. Our responsibility",
      paragraphs: [
        "We take good care of your mail, but we are not responsible for mail that is lost, late, or damaged before it reaches us, or for what senders put in it. If we lose or damage something after it reaches us, tell us right away and we will work with you to make it right.",
      ],
    },
    {
      heading: "9. Changes",
      paragraphs: [
        "If we change this agreement, we will tell you at the shop and give you a copy at least 30 days before the change starts.",
      ],
    },
  ],
};

// Same words as 2026-10-12 with the ZIP corrected: USPS lists 4051 Foothill Blvd
// under 94601 (94604 is a PO Box ZIP).
const V_2026_10_16: Agreement = {
  ...(JSON.parse(JSON.stringify(V_2026_10_12).replaceAll("CA 94604", "CA 94601")) as Agreement),
  version: "2026-10-16",
};

// Adds self-pay mailboxes (no sponsoring nonprofit): who pays, the 3-month
// minimum, and monthly bills. Changes only sections 3 and 7.
const V_2026_10_30: Agreement = (() => {
  const v = JSON.parse(JSON.stringify(V_2026_10_16)) as Agreement;
  v.version = "2026-10-30";
  const s3 = v.sections.find((x) => x.heading.startsWith("3."))!;
  s3.closing = [
    "If a partner nonprofit sponsors your mailbox, you never pay for it. Your nonprofit pays Post and Stuff for it. If you stop working with that nonprofit, tell us; we will help you find another sponsor, switch you to paying yourself, or close the mailbox.",
    "If no nonprofit sponsors you (self-pay), you pay the monthly price we agree on when your mailbox is activated. The first 3 months (counting the month you start) are the minimum; after that your mailbox is month to month. We send your bill at the start of each month by email, or by text if you agreed to bill texts. Pay at the shop, or online if we give you a link.",
  ];
  const s7 = v.sections.find((x) => x.heading.startsWith("7."))!;
  s7.bullets = [
    ...(s7.bullets ?? []).slice(0, 2),
    "Self-pay: if your bill is not paid, we may close your mailbox with 30 days' notice. Closing does not cancel what you owe for the 3-month minimum.",
    ...(s7.bullets ?? []).slice(2),
  ];
  return v;
})();

export const AGREEMENTS: Record<string, Agreement> = {
  [V_2026_10_12.version]: V_2026_10_12,
  [V_2026_10_16.version]: V_2026_10_16,
  [V_2026_10_30.version]: V_2026_10_30,
};
export const CURRENT_AGREEMENT = V_2026_10_30;
