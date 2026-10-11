import type { NextAuthConfig } from "next-auth";
import { SESSION_IDLE_SECONDS } from "@/lib/security";

// Session settings shared by the middleware (which can't use the database) and
// the full login setup in auth.ts. Providers are added in auth.ts.
export const authConfig = {
  pages: { signIn: "/login" },
  // Sessions expire after 30 minutes without activity; each request extends them.
  session: { strategy: "jwt", maxAge: SESSION_IDLE_SECONDS },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.identity) token.identity = user.identity;
      return token;
    },
    session({ session, token }) {
      if (token.identity) {
        session.user = { ...session.user, ...token.identity };
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
