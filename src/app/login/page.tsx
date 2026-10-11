import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homeFor } from "@/lib/session";
import { LoginForms } from "./login-forms";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.role) redirect(homeFor(session.user.role));

  return (
    <main className="min-h-screen bg-[#1c1a1d] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 p-6">
        <h1 className="text-center text-3xl font-extrabold text-[#e8f4f0] [text-shadow:0_0_12px_#7fe3d4]">
          Post <span className="text-[#f48fb1]">&amp;</span> Stuff Mail
        </h1>
        <LoginForms />
        <p className="text-center text-sm text-[#e8f4f0]/80">
          Forgot your PIN? Come by the shop or call{" "}
          <a href="tel:+14157251603" className="text-[#ffd166] underline">
            (415) 725-1603
          </a>
          .
        </p>
      </div>
    </main>
  );
}
