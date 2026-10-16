"use client";

import { logout } from "@/app/actions/auth";
import { t } from "@/lib/i18n";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        title={t.auth.logout}
        className="flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition hover:bg-base-700 hover:text-slate-100"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </form>
  );
}
