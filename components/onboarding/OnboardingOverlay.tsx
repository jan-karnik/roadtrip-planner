"use client";

import { usePreferences } from "@/components/prefs/PreferencesProvider";
import { t } from "@/lib/i18n";

const ONBOARDING_ENABLED = false;

export function OnboardingOverlay() {
  const { onboardingSeen, dismissOnboarding } = usePreferences();

  if (!ONBOARDING_ENABLED || onboardingSeen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-base-800/95 shadow-2xl backdrop-blur-md">
        <div className="p-7">
          <h2 className="text-xl font-bold text-white leading-snug mb-2">
            {t.onboarding.title}
          </h2>
          <p className="text-sm text-white/60 mb-6">
            {t.onboarding.intro}
          </p>

          <ul className="flex flex-col gap-4 mb-8">
            <FeatureRow
              emoji={t.onboarding.featureMapEmoji}
              label={t.onboarding.featureMapLabel}
              description={t.onboarding.featureMap}
            />
            <FeatureRow
              emoji={t.onboarding.featureDraftEmoji}
              label={t.onboarding.featureDraftLabel}
              description={t.onboarding.featureDraft}
            />
            <FeatureRow
              emoji={t.onboarding.featureDaysEmoji}
              label={t.onboarding.featureDaysLabel}
              description={t.onboarding.featureDays}
            />
          </ul>

          <button
            type="button"
            onClick={dismissOnboarding}
            className="w-full rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-accent ring-1 ring-inset ring-accent/40 transition hover:bg-accent/30 hover:ring-accent/60 active:scale-[0.98]"
          >
            {t.onboarding.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  emoji,
  label,
  description,
}: {
  emoji: string;
  label: string;
  description: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="text-xl leading-tight shrink-0 mt-0.5">{emoji}</span>
      <div>
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className="text-sm text-white/50"> — {description}</span>
      </div>
    </li>
  );
}
