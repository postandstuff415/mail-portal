import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ipFromHeaders } from "@/lib/audit";
import { isStaff, type Viewer } from "@/lib/permissions";
import { sessionStillValid } from "@/lib/session-check";

// Server-side helpers for pages and actions. The identity always comes from
// the signed session cookie, never from the URL or form fields.

export async function requireViewer(): Promise<Viewer & { name: string }> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");
  // /logout clears the cookie (pages can't), avoiding a login/home redirect loop.
  if (!(await sessionStillValid(session.user))) redirect("/logout");
  if (session.user.mustChangePassword) redirect("/account/password");
  return session.user;
}

export async function requireStaff() {
  const viewer = await requireViewer();
  if (!isStaff(viewer)) notFound();
  return viewer;
}

export async function requestIp(): Promise<string | null> {
  return ipFromHeaders(await headers());
}

// Where each role lands after logging in.
export function homeFor(role: Viewer["role"]): string {
  if (role === "CLIENT") return "/mail";
  if (role === "STAFF" || role === "ADMIN") return "/staff";
  return "/clients";
}

export { sessionStillValid };
