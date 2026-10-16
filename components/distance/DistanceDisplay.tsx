"use client";

import { usePreferences } from "@/components/prefs/PreferencesProvider";
import { DISTANCE_UNITS, formatDistance } from "@/lib/units";

/**
 * Renders a distance (stored in km) in the user's primary unit, with the other
 * unit revealed on hover. Mirrors TimeStamp's dual-display pattern.
 */
export function DistanceDisplay({
  km,
  className = "",
}: {
  km: number;
  className?: string;
}) {
  const { distanceUnit } = usePreferences();

  return (
    <span
      className={`group relative inline-flex cursor-help items-center ${className}`}
    >
      <span className="underline decoration-dotted decoration-1 underline-offset-2">
        {formatDistance(km, distanceUnit)}
      </span>

      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 flex -translate-x-1/2 flex-col gap-1 whitespace-nowrap rounded-md border border-base-600 bg-base-900 px-3 py-2 text-xs opacity-0 shadow-xl transition-opacity duration-100 group-hover:opacity-100"
      >
        {DISTANCE_UNITS.map((u) => (
          <span key={u} className="flex items-center gap-2">
            <span className="w-8 font-semibold uppercase text-slate-400">
              {u}
            </span>
            <span className="text-slate-200">{formatDistance(km, u)}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
