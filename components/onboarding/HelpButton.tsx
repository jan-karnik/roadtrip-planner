"use client";

import { usePreferences } from "@/components/prefs/PreferencesProvider";
import { t } from "@/lib/i18n";

export function HelpButton() {
  const { showOnboarding } = usePreferences();
  return (
    <button
      type="button"
      onClick={showOnboarding}
      title={t.onboarding.helpButton}
      className="hidden h-9 items-center rounded-md px-2 text-xs text-slate-400 transition hover:bg-base-700 hover:text-slate-200 sm:flex"
    >
      ?
    </button>
  );
}
