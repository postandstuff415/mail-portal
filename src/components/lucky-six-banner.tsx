import Link from "next/link";
import { bannerCountdown, luckySixCount, luckySixOn } from "@/lib/lucky-six";

// Public "Lucky 6" banner (home and sign-up pages), with a live countdown.
export async function LuckySixBanner() {
  if (!luckySixOn()) return null;
  // A database hiccup must never take down the public pages: show the banner without the countdown.
  const count = await luckySixCount().catch(() => null);
  return (
    <div className="rounded-xl border-2 border-[#ffd166] bg-[#ffd166]/10 p-4 text-center text-[#e8f4f0] shadow-[0_0_14px_#ffd166]">
      <p className="text-sm font-bold uppercase tracking-widest text-[#ffd166]">🎲 Lucky 6</p>
      <p className="mt-1 text-xl font-extrabold">
        Every 6th new mailbox gets its <span className="text-[#ffd166]">first 6 months FREE</span>
      </p>
      {count !== null && <p className="mt-1 font-semibold text-[#7fe3d4]">{bannerCountdown(count)}</p>}
      <p className="mt-2 text-xs opacity-80">
        Self-pay mailboxes only. Counted when your mailbox is activated at the shop.{" "}
        <Link href="/lucky-six" className="text-[#ffd166] underline">
          Rules
        </Link>
      </p>
    </div>
  );
}
