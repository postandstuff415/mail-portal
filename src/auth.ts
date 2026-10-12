import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
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

function toUser(result: LoginResult) {
  if (result.ok) return { id: result.identity.id, name: result.identity.name, identity: result.identity };
  if (result.reason === "locked") throw new LockedLogin();
  throw new InvalidLogin();
}

const clientSchema = z.object({
  pmbNumber: z.string().trim().min(1).max(20),
  pin: z.string().regex(/^\d{6}$/),
});

const userSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
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
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = userSchema.safeParse(credentials);
        if (!parsed.success) throw new InvalidLogin();
        const ip = ipFromHeaders(request?.headers);
        return toUser(await loginUser(parsed.data.email, parsed.data.password, ip));
      },
    }),
  ],
});
