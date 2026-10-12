import Link from "next/link";
import { SiteFooter } from "@/components/public-page";

// Public homepage. Colors follow the Post and Stuff flier: dark background,
// neon pink / teal / yellow.
export default function Home() {
  return (
    <div className="min-h-screen bg-[#1c1a1d] text-white">
      <main className="mx-auto flex max-w-md flex-col justify-center gap-8 p-6 pt-16">
        <div className="text-center">
          <div className="text-5xl" aria-hidden>
            🚀
          </div>
          <h1 className="mt-2 text-5xl font-extrabold tracking-wide text-[#e8f4f0] [text-shadow:0_0_12px_#7fe3d4]">
            POST
          </h1>
          <p className="text-4xl font-extrabold tracking-wide text-[#f48fb1] [text-shadow:0_0_12px_#f48fb1]">
            &amp; STUFF
          </p>
        </div>

        <p className="text-center text-lg text-[#e8f4f0]">
          A real street address for your mail in Oakland, held securely and viewable on your phone.
        </p>

        <Link
          href="/login"
          className="flex h-14 items-center justify-center rounded-md border-2 border-[#7fe3d4] text-lg font-semibold text-[#7fe3d4] shadow-[0_0_12px_#7fe3d4]"
        >
          Log in to see your mail
        </Link>

        <ul className="flex flex-col gap-3 text-[#e8f4f0]">
          <li>
            <strong className="text-[#f48fb1]">Receive your mail securely.</strong> We photograph the outside of each
            piece and keep it safe on our shelf until you pick it up.
          </li>
          <li>
            <strong className="text-[#ffd166]">Packages accepted</strong> — if it will fit through our door.
          </li>
          <li>
            <strong className="text-[#7fe3d4]">Check your mail anywhere.</strong> Log in from any phone with your
            mailbox number and PIN. Optional text alerts when mail arrives.
          </li>
          <li>
            <strong>For nonprofits:</strong> $15 per client per month (90-day minimum), billed to your organization.
            Case managers can check mail for the clients they support. Call us to partner.
          </li>
        </ul>

        <div className="rounded-xl border border-[#7fe3d4]/60 p-4 text-sm leading-6 text-[#e8f4f0]">
          <p>4051 Foothill Blvd, Oakland, CA 94604</p>
          <p>
            <a href="tel:+14157251603" className="text-[#ffd166] underline">
              (415) 725-1603
            </a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
