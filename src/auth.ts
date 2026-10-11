import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { ipFromHeaders } from "@/lib/audit";
import { loginClient, loginUser, type LoginResult } from "@/lib/login";

// Error codes the login page turns into friendly messages. Kept generic on
// purpose: never say whether the mailbox number or the PIN was wrong.
class InvalidLogin extends CredentialsSignin {
  code = "invalid";
}
class LockedLogin extends CredentialsSignin {
  code = "locked";
}
class CodeRequired extends CredentialsSignin {
  code = "code_required";
}

function toUser(result: LoginResult) {
  if (result.ok) return { id: result.identity.id, name: result.identity.name, identity: result.identity };
  if (result.reason === "locked") throw new LockedLogin();
  if (result.reason === "code_required") throw new CodeRequired();
  throw new InvalidLogin();
}

const clientSchema = z.object({
  pmbNumber: z.string().trim().min(1).max(20),
  pin: z.string().regex(/^\d{6}$/),
});

const userSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
  code: z.string().trim().max(10).optional(),
});

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "client-pin",
      name: "Mailbox number and PIN",
      credentials: { pmbNumber: {}, pin: {} },
      async authorize(credentials, request) {
        const parsed = clientSchema.safeParse(credentials);
        if (!parsed.success) throw new InvalidLogin();
        const ip = ipFromHeaders(request?.headers);
        return toUser(await loginClient(parsed.data.pmbNumber, parsed.data.pin, ip));
      },
    }),
    Credentials({
      id: "staff-password",
      name: "Email and password",
      credentials: { email: {}, password: {}, code: {} },
      async authorize(credentials, request) {
        const parsed = userSchema.safeParse({
          ...credentials,
          code: credentials?.code ? String(credentials.code) : undefined,
        });
        if (!parsed.success) throw new InvalidLogin();
        const ip = ipFromHeaders(request?.headers);
        const { email, password, code } = parsed.data;
        return toUser(await loginUser(email, password, code || undefined, ip));
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      // A session refresh (after finishing 2-step setup) re-reads the database
      // instead of trusting anything the browser sent.
      if (params.trigger === "update" && token.identity && token.identity.role !== "CLIENT") {
        const user = await db.user.findUnique({ where: { id: token.identity.id } });
        if (!user) return null;
        const needsTotp = user.role === "STAFF" || user.role === "ADMIN";
        token.identity = { ...token.identity, needs2faSetup: needsTotp && !user.twoFactorSecret };
      }
      return token;
    },
  },
});
