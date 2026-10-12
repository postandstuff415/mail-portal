import { signOut } from "@/auth";

// Clears the session cookie. Used when an account was removed or changed while
// someone was logged in (pages can't clear cookies themselves).
export async function GET() {
  await signOut({ redirectTo: "/login" });
}
