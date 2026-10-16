"use client";

import { ZONES, formatInZone, type ZoneKey } from "@/lib/timezones";
import { usePreferences } from "@/components/prefs/PreferencesProvider";

/**
 * Renders a single instant. The visible label uses the user's primary zone
 * (from preferences, coloured by that zone); hovering reveals the time in BOTH
 * Prague and SFO, each in its assigned colour, so it's always clear which zone
 * you're reading.
 */
export function TimeStamp({
  iso,
  className = "",
}: {
  iso: string;
  className?: string;
}) {
  const { primaryZone } = usePreferences();
  const instant = new Date(iso);
  const primary = ZONES[primaryZone];

  return (
    <span
      className={`group relative inline-flex cursor-help items-center ${className}`}
    >
      <span
        style={{ color: primary.color }}
        className="underline decoration-dotted decoration-1 underline-offset-2"
      >
        {formatInZone(instant, primary.id)}
      </span>

      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 flex -translate-x-1/2 flex-col gap-1 whitespace-nowrap rounded-md border border-base-600 bg-base-900 px-3 py-2 text-xs opacity-0 shadow-xl transition-opacity duration-100 group-hover:opacity-100"
      >
        {(Object.keys(ZONES) as ZoneKey[]).map((key) => (
          <span key={key} className="flex items-center gap-2">
            <span
              style={{ color: ZONES[key].color }}
              className="w-12 font-semibold"
            >
              {ZONES[key].label}
            </span>
            <span className="text-slate-200">
              {formatInZone(instant, ZONES[key].id)}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
