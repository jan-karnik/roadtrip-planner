"use client";

import { Moon, Car, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { DistanceDisplay } from "@/components/distance/DistanceDisplay";
import { TimeStamp } from "@/components/time/TimeStamp";
import { legColor } from "@/lib/legs";
import { DriveNavLinks } from "@/components/nav/DriveNavLinks";
import { StopLocalTime } from "@/components/time/StopLocalTime";
import { driveDirectionsEndpoints, type NavStop } from "@/lib/driveNav";
import { formatCivilDate, type Schedule } from "@/lib/schedule";
import { t } from "@/lib/i18n";

export function DaySchedule({
  schedule,
  arriveIso,
  departIso,
  hoveredDayLegs,
  onHoverDay,
  navStops = [],
}: {
  schedule: Schedule | null;
  arriveIso: string | null;
  departIso: string | null;
  hoveredDayLegs?: Set<number> | null;
  onHoverDay?: (legIndices: number[] | null) => void;
  /** Coords aligned to the active stops used to build `schedule`. */
  navStops?: NavStop[];
}) {
  if (!schedule) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/40">
        {t.schedule.noWindow}
      </p>
    );
  }

  const { fit } = schedule;
  const fitTone =
    fit === 0
      ? "text-emerald-300 ring-emerald-500/30 bg-emerald-500/10"
      : fit > 0
        ? "text-amber-300 ring-amber-500/30 bg-amber-500/10"
        : "text-rose-300 ring-rose-500/30 bg-rose-500/10";
  const fitLabel =
    fit === 0
      ? t.schedule.fitExact
      : fit > 0
        ? t.schedule.fitOver(fit)
        : t.schedule.fitUnder(-fit);

  return (
    <div className="flex flex-col gap-2 overflow-x-hidden">
      <div className="flex items-center gap-2 px-0.5">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${fitTone}`}
          title={fitLabel}
        >
          {t.schedule.nightsOf(schedule.totalNights, schedule.tripNights)}
          {fit !== 0 ? ` · ${fitLabel}` : ""}
        </span>
      </div>

      <ol className="flex flex-col gap-1.5">
        {arriveIso && (
          <li className="flex min-w-0 items-center gap-2 px-1 text-xs text-white/40">
            <PlaneLanding className="h-3.5 w-3.5 shrink-0 text-accent/70" />
            <span>{t.itinerary.arrive}</span>
            <TimeStamp iso={arriveIso} className="ml-auto" />
          </li>
        )}

        {schedule.nights.map((night) => {
          const driveNav =
            night.drive && navStops.length > 0
              ? driveDirectionsEndpoints(
                  night.drive,
                  night.stopName,
                  navStops,
                )
              : null;
          const sleepStop = navStops.find((s) => s.label === night.stopName);
          return night.drive ? (
            <li
              key={night.index}
              className={`cursor-pointer rounded-lg border border-white/10 py-2.5 pl-3 pr-3 transition-colors ${night.drive.legIndices.some((i) => hoveredDayLegs?.has(i)) ? "bg-white/10" : "bg-white/5"}`}
              style={{ borderLeftColor: legColor(night.drive.hours), borderLeftWidth: 2 }}
              onMouseEnter={() => onHoverDay?.(night.drive!.legIndices)}
              onMouseLeave={() => onHoverDay?.(null)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-white/40">
                  {formatCivilDate(night.date)}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-white/50">
                  <span>{t.units.duration(night.drive.hours)}</span>
                  <span className="text-white/30">·</span>
                  <DistanceDisplay km={night.drive.km} />
                </span>
              </div>
              <div
                className="mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-snug"
                style={{ color: legColor(night.drive.hours) }}
              >
                <Car className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>{t.schedule.driveLeg(night.drive.fromName, night.stopName)}</span>
              </div>
              {driveNav && (
                <div onClick={(e) => e.stopPropagation()}>
                  <DriveNavLinks
                    origin={driveNav.origin}
                    destination={driveNav.destination}
                    compact
                  />
                </div>
              )}
              {sleepStop && (
                <StopLocalTime
                  instant={night.date}
                  stop={{
                    name: sleepStop.label,
                    lat: sleepStop.lat,
                    lng: sleepStop.lng,
                  }}
                  className="mt-1 block font-mono text-[10px] text-white/35"
                />
              )}
            </li>
          ) : (
            <li
              key={night.index}
              className="rounded-lg border border-white/10 bg-white/5 py-2.5 pl-3 pr-3"
            >
              <div className="font-mono text-[11px] text-white/40">
                {formatCivilDate(night.date)}
              </div>
              <div className="mt-1.5 flex items-start gap-1.5 text-xs leading-snug">
                <Moon className="mt-px h-3.5 w-3.5 shrink-0 text-white/30" />
                <span>
                  <span className="font-medium text-white/80">{night.stopName}</span>
                  <span className="text-white/30"> · {t.schedule.restDay}</span>
                </span>
              </div>
              {sleepStop && (
                <StopLocalTime
                  instant={night.date}
                  stop={{
                    name: sleepStop.label,
                    lat: sleepStop.lat,
                    lng: sleepStop.lng,
                  }}
                  className="mt-1 block font-mono text-[10px] text-white/35"
                />
              )}
            </li>
          );
        })}

        {departIso && (
          <li className="flex min-w-0 items-center gap-2 px-1 text-xs text-white/40">
            <PlaneTakeoff className="h-3.5 w-3.5 shrink-0 text-accent/70" />
            <span>{t.itinerary.depart}</span>
            <TimeStamp iso={departIso} className="ml-auto" />
          </li>
        )}
      </ol>
    </div>
  );
}
