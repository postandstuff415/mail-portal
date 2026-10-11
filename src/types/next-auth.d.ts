import type { DefaultSession } from "next-auth";
import type { SessionIdentity } from "@/lib/login";

declare module "next-auth" {
  interface User {
    identity?: SessionIdentity;
  }
  interface Session {
    user: SessionIdentity & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    identity?: SessionIdentity;
  }
}
