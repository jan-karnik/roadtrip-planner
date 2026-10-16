"use client";

import { Navigation } from "lucide-react";
import {
  appleMapsDirectionsUrl,
  googleMapsDirectionsUrl,
  type LatLng,
} from "@/lib/driveNav";
import { t } from "@/lib/i18n";

/** Compact Google + Apple Maps links for one driving leg. */
export function DriveNavLinks({
  origin,
  destination,
  compact = false,
}: {
  origin: LatLng;
  destination: LatLng;
  compact?: boolean;
}) {
  const google = googleMapsDirectionsUrl(origin, destination);
  const apple = appleMapsDirectionsUrl(origin, destination);
  const linkClass = compact
    ? "inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 text-[11px] font-medium text-white/70 transition active:bg-white/10"
    : "inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-medium text-white/80 transition active:bg-white/10";

  return (
    <div
      className={
        compact
          ? "mt-2 flex flex-wrap items-center gap-2"
          : "mt-2 flex flex-wrap gap-2"
      }
    >
      {!compact && (
        <span className="flex w-full items-center gap-1 text-[11px] text-white/40">
          <Navigation className="h-3 w-3" />
          {t.schedule.navigateDrive}
        </span>
      )}
      <a
        href={google}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {t.schedule.openInGoogleMaps}
      </a>
      <a
        href={apple}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {t.schedule.openInAppleMaps}
      </a>
    </div>
  );
}
