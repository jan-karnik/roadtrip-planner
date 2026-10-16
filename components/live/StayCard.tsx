"use client";

import { Car, Hotel, Lock, MapPin, Moon, Phone, Link as LinkIcon } from "lucide-react";
import { DistanceDisplay } from "@/components/distance/DistanceDisplay";
import { legColor } from "@/lib/legs";
import { formatCivilDate } from "@/lib/schedule";
import { DriveNavLinks } from "@/components/nav/DriveNavLinks";
import { StopLocalTime } from "@/components/time/StopLocalTime";
import {
  driveDirectionsEndpoints,
  type NavStop,
} from "@/lib/driveNav";
import { googleMapsUrl, googleMapsUrlForCoords, type LiveNight } from "@/lib/live";
import { t } from "@/lib/i18n";
import type { LiveStop } from "@/lib/liveItinerary";

// One night: where we sleep, in which hotel, and the drive that got us there.
// `hero` is the view's anchor (tonight); `compact` is the same night in the
// previous/upcoming lists.

export function StayCard({
  night,
  stop,
  nightNumber,
  totalNights,
  variant = "compact",
  dimmed = false,
  label,
  navStops = [],
}: {
  night: LiveNight;
  stop: LiveStop | null;
  nightNumber: number;
  totalNights: number;
  variant?: "hero" | "compact";
  dimmed?: boolean;
  label?: string;
  navStops?: NavStop[];
}) {
  const hero = variant === "hero";
  const { drive } = night;
  const driveNav =
    drive && navStops.length > 0
      ? driveDirectionsEndpoints(drive, night.stopName, navStops)
      : null;
  // The stop we sleep at IS the hotel when it's a booked one — no date lookup.
  const hotel = stop?.isHotel ? stop : null;
  // For a hotel, search by name + address: the postal address navigates more
  // reliably than the geocoder's coordinates. Otherwise aim at the stop itself.
  const mapsHref = hotel
    ? googleMapsUrl({ name: hotel.name, address: hotel.address })
    : stop
      ? googleMapsUrlForCoords(stop.lat, stop.lng)
      : null;

  return (
    <article
      className={[
        "rounded-2xl border transition-colors",
        hero
          ? "border-accent/40 bg-accent/[0.07] p-4 shadow-lg shadow-accent/5"
          : "border-white/10 bg-white/5 p-3",
        dimmed ? "opacity-55" : "",
      ].join(" ")}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {label && (
            <p
              className={`font-medium uppercase tracking-wide ${hero ? "text-xs text-accent" : "text-[10px] text-white/40"}`}
            >
              {label}
            </p>
          )}
          <p
            className={`font-mono ${hero ? "mt-0.5 text-sm text-white/60" : "text-[11px] text-white/40"}`}
          >
            {formatCivilDate(night.date)}
          </p>
        </div>
        <span
          className={`shrink-0 font-mono ${hero ? "text-xs text-white/40" : "text-[10px] text-white/30"}`}
        >
          {t.live.nightOf(nightNumber, totalNights)}
        </span>
      </header>

      <div className="mt-1 flex items-start gap-1.5">
        <Moon
          className={`mt-0.5 shrink-0 ${hero ? "h-5 w-5 text-accent" : "h-3.5 w-3.5 text-white/30"}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2
              className={`min-w-0 truncate font-semibold ${hero ? "text-2xl text-white" : "text-sm text-white/80"}`}
            >
              {night.stopName}
            </h2>
            {stop && stop.bookedNights > 0 && (
              <Lock
                className={`shrink-0 text-emerald-400/70 ${hero ? "h-4 w-4" : "h-3 w-3"}`}
                aria-label={t.live.booked}
              />
            )}
          </div>
          {stop && (
            <StopLocalTime
              instant={night.date}
              stop={{ name: stop.name, lat: stop.lat, lng: stop.lng }}
              className={`block font-mono text-white/40 ${hero ? "mt-0.5 text-xs" : "mt-px text-[10px]"}`}
            />
          )}
        </div>
      </div>

      {/* --- Accommodation ------------------------------------------------- */}
      {hotel ? (
        <div className={hero ? "mt-3" : "mt-2"}>
          <div className="flex items-start gap-2">
            <Hotel
              className={`mt-0.5 shrink-0 text-white/40 ${hero ? "h-4 w-4" : "h-3.5 w-3.5"}`}
            />
            <div className="min-w-0">
              {/* The stop IS the hotel, so its name is already the heading —
                  only repeat the full title when it adds something. */}
              {hotel.name !== night.stopName && (
                <p
                  className={`font-medium leading-snug text-white ${hero ? "text-base" : "text-xs"}`}
                >
                  {hotel.name}
                </p>
              )}
              {hotel.address && (
                <p
                  className={`leading-snug text-white/50 ${hero ? "text-sm" : "text-[11px]"}`}
                >
                  {hotel.address}
                </p>
              )}
            </div>
          </div>

          {hero && (
            <div className="mt-3 flex flex-wrap gap-2">
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-base-900 transition-opacity active:opacity-80"
                >
                  <MapPin className="h-4 w-4" />
                  {t.live.openInMaps}
                </a>
              )}
              {hotel.phone && (
                <a
                  href={`tel:${hotel.phone.replace(/\s/g, "")}`}
                  aria-label={t.live.callHotel}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-white/70 active:bg-white/10"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
              {hotel.url && (
                <a
                  href={hotel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.live.openBooking}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-white/70 active:bg-white/10"
                >
                  <LinkIcon className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`flex items-center gap-2 text-white/35 ${hero ? "mt-3 text-sm" : "mt-2 text-[11px]"}`}
        >
          <Hotel className={hero ? "h-4 w-4" : "h-3.5 w-3.5"} />
          <span>{t.live.noBooking}</span>
        </div>
      )}

      {/* Without a hotel we can still navigate to the town. */}
      {hero && !hotel && mapsHref && (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white/70 active:bg-white/10"
        >
          <MapPin className="h-4 w-4" />
          {t.live.openInMaps}
        </a>
      )}

      {/* --- The drive that lands here ------------------------------------- */}
      {drive ? (
        <div
          className={`flex items-start gap-2 border-l-2 pl-2.5 ${hero ? "mt-4" : "mt-2"}`}
          style={{ borderLeftColor: legColor(drive.hours) }}
        >
          <Car
            className={`mt-px shrink-0 ${hero ? "h-4 w-4" : "h-3.5 w-3.5"}`}
            style={{ color: legColor(drive.hours) }}
          />
          <div className="min-w-0 flex-1">
            <p
              className={`leading-snug text-white/70 ${hero ? "text-sm" : "text-[11px]"}`}
            >
              {t.schedule.driveLeg(drive.fromName, night.stopName)}
            </p>
            <p
              className={`mt-0.5 flex items-center gap-1.5 text-white/50 ${hero ? "text-sm" : "text-[11px]"}`}
            >
              <span>{t.units.duration(drive.hours)}</span>
              <span className="text-white/25">·</span>
              <DistanceDisplay km={drive.km} />
            </p>
            {hero && driveNav && (
              <DriveNavLinks
                origin={driveNav.origin}
                destination={driveNav.destination}
              />
            )}
          </div>
        </div>
      ) : (
        hero && (
          <p className="mt-4 flex items-center gap-2 text-sm text-white/40">
            <Car className="h-4 w-4" />
            {t.live.noDrive}
          </p>
        )
      )}
    </article>
  );
}
