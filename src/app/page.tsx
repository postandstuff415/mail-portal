import { Button } from "@/components/ui/button";

// Colors follow the Post and Stuff flier: dark background, neon pink / teal / yellow.
export default function Home() {
  return (
    <main className="min-h-screen bg-[#1c1a1d] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 p-6">
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
          Your mail, held securely and viewable on your phone.
        </p>

        {/* Login pages arrive in Phase 2. */}
        <Button
          size="lg"
          className="h-14 border-2 border-[#7fe3d4] bg-transparent text-lg text-[#7fe3d4] shadow-[0_0_12px_#7fe3d4]"
          disabled
        >
          Log in (coming soon)
        </Button>

        <div className="rounded-xl border border-[#7fe3d4]/60 p-4 text-sm leading-6 text-[#e8f4f0]">
          <p>4051 Foothill Blvd, Oakland, CA 94604</p>
          <p>
            <a href="tel:+14157251603" className="text-[#ffd166] underline">
              (415) 725-1603
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
