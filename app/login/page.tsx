"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, {});

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-base-700 bg-base-800 p-8 shadow-xl">
        <div className="mb-6 text-center">
          <span className="text-2xl">🛰️</span>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-slate-100">
            {t.auth.heading}
          </h1>
          <p className="mt-1 text-xs text-slate-500">{t.auth.subtitle}</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          {state?.error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="username"
              className="text-xs font-medium text-slate-400"
            >
              {t.auth.username}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="rounded-lg border border-base-600 bg-base-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none ring-0 transition focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-slate-400"
            >
              {t.auth.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-base-600 bg-base-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none ring-0 transition focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? t.auth.submitting : t.auth.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
