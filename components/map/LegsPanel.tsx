"use client";

import { DistanceDisplay } from "@/components/distance/DistanceDisplay";
import { exertionLevel, type Leg } from "@/lib/legs";
import { t } from "@/lib/i18n";

export function LegsPanel({
  legs,
  hoveredLegIndex,
  onHoverLeg,
}: {
  legs: Leg[];
  hoveredLegIndex: number | null;
  onHoverLeg: (index: number | null) => void;
}) {
  if (legs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/40">
        {t.map.noLegs}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {legs.map((leg) => {
        const active = hoveredLegIndex === leg.index;
        return (
          <li
            key={leg.index}
            onMouseEnter={() => onHoverLeg(leg.index)}
            onMouseLeave={() => onHoverLeg(null)}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition ${
              active
                ? "border-white/20 bg-white/15"
                : "border-white/10 bg-white/5"
            }`}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: leg.color }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-white/90">
                {t.map.leg(
                  leg.from.shortName ?? leg.from.name,
                  leg.to.shortName ?? leg.to.name,
                )}
              </div>
              <div className="text-xs" style={{ color: leg.color }}>
                {t.map.exertion[exertionLevel(leg.hours)]}
                {leg.fallback && (
                  <span className="ml-1 text-white/30" title={t.map.approx}>
                    ~
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right text-sm">
              <div className="text-white/80">
                <DistanceDisplay km={leg.km} />
              </div>
              <div className="text-xs text-white/40">
                {t.units.duration(leg.hours)}
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${leg.from.lat},${leg.from.lng}&destination=${leg.to.lat},${leg.to.lng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              title={t.map.openInGoogleMaps}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded p-1 text-white/30 transition hover:text-white/80"
              aria-label={t.map.openInGoogleMaps}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
