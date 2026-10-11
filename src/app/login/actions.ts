"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string; needCode?: boolean };

const MESSAGES: Record<string, string> = {
  invalid: "That didn't match. Check your details and try again.",
  locked: "Too many tries. This login is locked for 15 minutes. Staff at the shop can help.",
};

function messageFor(error: AuthError): LoginState {
  const code = (error as AuthError & { code?: string }).code ?? "invalid";
  if (code === "code_required") return { needCode: true };
  return { error: MESSAGES[code] ?? MESSAGES.invalid };
}

export async function clientLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("client-pin", {
      pmbNumber: formData.get("pmbNumber"),
      pin: formData.get("pin"),
      redirectTo: "/mail",
    });
  } catch (error) {
    if (error instanceof AuthError) return messageFor(error);
    throw error; // the successful-login redirect
  }
  return {};
}

export async function staffLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("staff-password", {
      email: formData.get("email"),
      password: formData.get("password"),
      code: formData.get("code") ?? "",
      redirectTo: "/home",
    });
  } catch (error) {
    if (error instanceof AuthError) return messageFor(error);
    throw error;
  }
  return {};
}
