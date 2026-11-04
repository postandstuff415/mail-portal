import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";
import { LUCKY_EVERY, LUCKY_FREE_MONTHS } from "@/lib/lucky-six";

export const metadata: Metadata = { title: "Lucky 6 rules · Post and Stuff" };

// Plain-language rules for the "Lucky 6" promo. Keep in sync with src/lib/lucky-six.ts.
export default function LuckySixRulesPage() {
  return (
    <PublicPage title="Lucky 6 rules">
      <p>Starting November 2026.</p>
      <ul>
        <li>
          Every {LUCKY_EVERY}th new <strong>self-pay</strong> mailbox gets its first {LUCKY_FREE_MONTHS} months free.
          Mailboxes paid for by a partner nonprofit are already free to the client and are not part of this offer.
        </li>
        <li>
          We count a mailbox when it is <strong>activated at our shop</strong>: two forms of ID checked and USPS Form
          1583 signed. Filling out the online form alone does not count.
        </li>
        <li>
          Mailboxes are counted in the order they are activated. It is a set rule, not a drawing or a game of chance.
          You will know at activation if yours is a {LUCKY_EVERY}th; it is printed on your sign-up card.
        </li>
        <li>
          The free months are the first {LUCKY_FREE_MONTHS} calendar months, starting with the month your mailbox is
          activated. They cover the 3-month minimum. After that, you pay your regular monthly price, month to month.
        </li>
        <li>
          One free period per person. Re-opening a mailbox does not count again. Free months have no cash value and
          can&apos;t be transferred.
        </li>
        <li>
          We may end this offer at any time. Anyone who already won keeps their free months.
        </li>
      </ul>
      <p>
        Questions: call <a href="tel:+14157251603">(415) 725-1603</a> or stop by 4051 Foothill Blvd, Oakland.
      </p>
    </PublicPage>
  );
}
