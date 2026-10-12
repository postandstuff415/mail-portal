import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { SMS_CONSENT_TEXT } from "@/lib/sms-consent";

export const metadata: Metadata = { title: "Text alert terms · Post and Stuff" };

export default function SmsTermsPage() {
  return (
    <PublicPage title="Text alert terms">
      <p>Effective October 11, 2026.</p>

      <h2>What the program is</h2>
      <p>
        Post and Stuff Mail Alerts tells mailbox clients when new mail has arrived for them at Post and Stuff,
        4051 Foothill Blvd, Oakland, CA 94604. Texts only say how many pieces arrived. They never include who the
        mail is from or what it says. We never send marketing or promotional texts.
      </p>

      <h2>How you sign up</h2>
      <p>
        Texts are optional. When you open a mailbox with us, online at{" "}
        <a href="/signup">postandstuff.com/signup</a> or on paper at our shop, the sign-up form has a separate,
        unchecked checkbox for text alerts, and you sign the form. We turn on alerts only when that box is checked and
        the form is signed. The wording is:
      </p>
      <blockquote className="rounded-lg border-l-4 border-[#ffd166] bg-white/5 p-4">
        <p>☐ {SMS_CONSENT_TEXT}</p>
        <p className="mt-2">Mobile number: ______________ Signature: ______________ Date: ________</p>
      </blockquote>

      <h2>How often</h2>
      <p>At most one text per day, sent around 5 pm Pacific, only on days you receive mail.</p>

      <h2>Example message</h2>
      <p className="rounded-lg bg-white/5 p-4 font-mono text-sm">
        Post and Stuff: you have 2 new pieces of mail. See it at postandstuff.com or stop by the shop. Reply STOP to
        opt out.
      </p>

      <h2>Stopping and help</h2>
      <ul>
        <li>
          Reply <strong>STOP</strong> at any time to stop all texts. You&apos;ll get one message confirming you&apos;re
          unsubscribed.
        </li>
        <li>
          Reply <strong>HELP</strong> for help, or call us at <a href="tel:+14157251603">(415) 725-1603</a>.
        </li>
        <li>You can also ask staff at the shop to turn text alerts on or off.</li>
      </ul>

      <h2>Costs</h2>
      <p>
        Post and Stuff does not charge for texts. Message and data rates from your mobile carrier may apply. Carriers
        are not liable for delayed or undelivered messages.
      </p>

      <h2>Privacy</h2>
      <p>
        We do not share or sell your mobile number. No mobile information will be shared with third parties or
        affiliates for marketing or promotional purposes. Text sign-up information and consent are never shared with
        anyone. See our <a href="/privacy">privacy policy</a>.
      </p>
    </PublicPage>
  );
}
