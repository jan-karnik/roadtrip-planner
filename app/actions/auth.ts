"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";

// demo/demo is a local-dev convenience only. In production all three must be
// set in .env, otherwise login is refused.
const IS_PROD = process.env.NODE_ENV === "production";
const USERNAME = process.env.AUTH_USERNAME || (IS_PROD ? null : "demo");
const PASSWORD = process.env.AUTH_PASSWORD || (IS_PROD ? null : "demo");
// Must match the value in middleware.ts
const SESSION_TOKEN =
  process.env.AUTH_SESSION_TOKEN || (IS_PROD ? null : "dev-session-token");
const SESSION_COOKIE = "rtp.auth";

export type AuthState = { error?: string };

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = (formData.get("username") as string | null) ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!USERNAME || !PASSWORD || !SESSION_TOKEN) {
    return { error: t.auth.notConfigured };
  }
  if (username !== USERNAME || password !== PASSWORD) {
    return { error: t.auth.error };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, SESSION_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect("/");
}

export async function logout(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
