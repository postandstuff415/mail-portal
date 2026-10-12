import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// First line of defense only: sends logged-out visitors to /login and keeps the
// 30-minute idle timer rolling. Every page and action still checks permissions
// itself on the server.
const { auth } = NextAuth(authConfig);

const PROTECTED = ["/mail", "/clients", "/staff", "/account", "/invoices"];

export default auth((req) => {
  const path = req.nextUrl.pathname;
  if (!PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) return;

  if (!req.auth?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (req.auth.user.mustChangePassword && path !== "/account/password") {
    return NextResponse.redirect(new URL("/account/password", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
