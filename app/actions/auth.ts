"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  createSessionValue,
  sessionSecret,
} from "@/lib/session";
import { clientKey, createLoginThrottle } from "@/lib/loginThrottle";

// demo/demo is a local-dev convenience only. In production all three must be
// set in .env, otherwise login is refused.
const IS_PROD = process.env.NODE_ENV === "production";
const USERNAME = process.env.AUTH_USERNAME || (IS_PROD ? null : "demo");
const PASSWORD = process.env.AUTH_PASSWORD || (IS_PROD ? null : "demo");

const throttle = createLoginThrottle();

// Hashing first makes both sides the same length, so timingSafeEqual never
// throws and the comparison time doesn't depend on where the inputs differ.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export type AuthState = { error?: string };

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = (formData.get("username") as string | null) ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  const secret = sessionSecret();
  if (!USERNAME || !PASSWORD || !secret) {
    return { error: t.auth.notConfigured };
  }

  const h = await headers();
  const key = clientKey(h.get("x-forwarded-for"), h.get("x-real-ip"));
  const waitMs = throttle.retryAfterMs(key);
  if (waitMs > 0) {
    return { error: t.auth.tooManyAttempts(Math.ceil(waitMs / 60_000)) };
  }

  // Evaluate both so a wrong username takes as long as a wrong password.
  const userOk = safeEqual(username, USERNAME);
  const passOk = safeEqual(password, PASSWORD);
  if (!userOk || !passOk) {
    throttle.recordFailure(key);
    return { error: t.auth.error };
  }
  throttle.reset(key);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSessionValue(secret), {
    httpOnly: true,
    // Production is expected to run behind HTTPS (see README).
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });

  redirect("/");
}

export async function logout(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
