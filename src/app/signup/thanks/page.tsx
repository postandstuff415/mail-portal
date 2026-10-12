import type { Metadata } from "next";
import { PublicPage } from "@/components/public-page";

export const metadata: Metadata = { title: "Thanks · Post and Stuff" };

export default function SignupThanks() {
  return (
    <PublicPage title="You're signed up">
      <p className="text-lg">We got your sign-up and your signed mailbox agreement.</p>
      <h2>What happens next</h2>
      <ol className="ml-6 list-decimal">
        <li>Your case manager will tell you the next ID sign-up day, or you can come to our shop.</li>
        <li>
          Bring <strong>two forms of ID</strong>, one with a photo.
        </li>
        <li>We check your IDs, you sign USPS Form 1583, and we give you your mailbox number and PIN.</li>
      </ol>
      <p>
        Questions? Call <a href="tel:+14157251603">(415) 725-1603</a>.
      </p>
    </PublicPage>
  );
}
