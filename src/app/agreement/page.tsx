import type { Metadata } from "next";
import { AgreementText } from "@/components/agreement-text";
import { PublicPage } from "@/components/public-page";
import { CURRENT_AGREEMENT } from "@/lib/agreement";

export const metadata: Metadata = { title: "Client mailbox agreement · Post and Stuff" };

export default function AgreementPage() {
  return (
    <PublicPage title={CURRENT_AGREEMENT.title}>
      <AgreementText agreement={CURRENT_AGREEMENT} />
    </PublicPage>
  );
}
