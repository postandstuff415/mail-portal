import Link from "next/link";

// Frame for public pages (privacy, texting terms): readable on a phone, flier colors.
export function PublicPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1c1a1d] text-[#e8f4f0]">
      <header className="border-b border-[#7fe3d4]/40 px-4 py-3">
        <Link href="/" className="text-lg font-extrabold [text-shadow:0_0_8px_#7fe3d4]">
          Post <span className="text-[#f48fb1]">&amp;</span> Stuff
        </Link>
      </header>
      <main className="mx-auto max-w-2xl p-4 pb-12 leading-7">
        <h1 className="mb-4 text-3xl font-bold">{title}</h1>
        <div className="flex flex-col gap-4 [&_a]:text-[#ffd166] [&_a]:underline [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-6 [&_ul]:list-disc">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#7fe3d4]/30 px-4 py-6 text-center text-sm text-[#e8f4f0]/80 print:hidden">
      <p>Post and Stuff · 4051 Foothill Blvd, Oakland, CA 94601 · (415) 725-1603</p>
      <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/privacy" className="underline">
          Privacy policy
        </Link>
        <Link href="/sms-terms" className="underline">
          Text alert terms
        </Link>
        <Link href="/agreement" className="underline">
          Mailbox agreement
        </Link>
      </p>
    </footer>
  );
}
