import Link from "next/link";
import { auth, signOut } from "@/auth";

// Page frame for signed-in screens: flier colors, name, password link (email
// accounts only), and a sign-out button.
export async function AppShell({ name, children }: { name: string; children: React.ReactNode }) {
  const session = await auth();
  const emailAccount = !!session?.user?.role && session.user.role !== "CLIENT";

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-[#1c1a1d] text-[#e8f4f0] print:bg-white">
      <header className="flex items-center justify-between border-b border-[#7fe3d4]/40 px-4 py-3 print:hidden">
        <Link href="/home" className="text-lg font-extrabold [text-shadow:0_0_8px_#7fe3d4]">
          Post <span className="text-[#f48fb1]">&amp;</span> Stuff
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{name}</span>
          {emailAccount && (
            <Link href="/account/password" className="underline">
              Password
            </Link>
          )}
          <form action={logout}>
            <button type="submit" className="rounded-md border border-[#ffd166] px-3 py-2 text-[#ffd166]">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-2xl p-4">{children}</main>
    </div>
  );
}
