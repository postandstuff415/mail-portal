import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";

export const metadata: Metadata = { title: "Privacy policy · Post and Stuff" };

export default function PrivacyPage() {
  return (
    <PublicPage title="Privacy policy">
      <p>Effective October 11, 2026.</p>
      <p>
        Post and Stuff (&quot;we&quot;) is a commercial mail receiving agency at 4051 Foothill Blvd, Oakland, CA
        94601. We receive mail for clients, many of whom are referred and paid for by partner nonprofits. This policy
        explains what we collect through our mail portal at postandstuff.com and how we protect it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Your name, mailbox number, and the nonprofit that referred you.</li>
        <li>
          From the online sign-up form: your date of birth, phone and email if you give them, your case manager&apos;s
          name and email, and your typed signature with the date, time, and device you signed from.
        </li>
        <li>Your mobile number, only if you give it to us for text alerts.</li>
        <li>
          Photos of the outside of your envelopes and packages. We open and scan what&apos;s inside only when you or
          your approved case manager asks us to.
        </li>
        <li>
          The details USPS requires on PS Form 1583 (including two forms of ID). The signed form is kept as USPS
          requires and is not shown in the portal.
        </li>
        <li>A log of logins and of who viewed which piece of mail, and when.</li>
      </ul>

      <h2>Who can see your mail</h2>
      <ul>
        <li>You, after logging in with your mailbox number and PIN.</li>
        <li>A case manager or caregiver you approved in writing. You can remove them at any time.</li>
        <li>Post and Stuff staff.</li>
        <li>
          Your referring nonprofit sees that you are enrolled (for billing and reports), but not your mail.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Only to receive, hold, and deliver your mail, to tell you when mail arrives, to bill the nonprofit that pays
        for your mailbox, and to meet USPS rules. We do not sell your information or use it for advertising.
      </p>

      <h2>Text messages</h2>
      <p>
        If you sign up for text alerts, texts only say how many pieces of mail arrived — never who sent them or what
        they say. No mobile information will be shared with third parties or affiliates for marketing or promotional
        purposes. Text sign-up information and consent are not shared with any third parties. Reply STOP to stop.
        Details are in our <a href="/sms-terms">text alert terms</a>.
      </p>

      <h2>Service providers</h2>
      <p>
        We use a few companies to run the portal: website hosting, a database and private file storage, a text
        message service, and an email service. They may only handle your information to provide those services to
        us.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We hold physical mail for 90 days, then return it to the
        sender or securely shred it. Envelope photos and records are kept while your mailbox is open and as long as
        USPS rules require after it closes.
      </p>

      <h2>Security</h2>
      <p>
        Mail photos are stored privately and open only through links that expire after 5 minutes. PINs and passwords
        are stored scrambled (hashed), logins lock after 5 wrong tries, and sessions end after 30 minutes without
        activity.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to see, correct, or close your account, stop text alerts, or remove an approved case manager by
        visiting the shop or calling <a href="tel:+14157251603">(415) 725-1603</a>.
      </p>

      <h2>Changes</h2>
      <p>If we change this policy, we&apos;ll update the date above and tell clients at the shop.</p>
    </PublicPage>
  );
}
