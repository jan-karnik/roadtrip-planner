"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Map as MapIcon } from "lucide-react";
import { getRoutes } from "@/app/actions/routes";
import {
  assembleLegs,
  activeLegPoints,
  pairsFrom,
  type RouteResult,
} from "@/lib/legs";
import { buildSchedule } from "@/lib/schedule";
import { ZONES } from "@/lib/timezones";
import { stopDisplayLabel } from "@/lib/driveNav";
import { nightStopIndices, resolveLiveState } from "@/lib/live";
import type { LiveStop } from "@/lib/liveItinerary";
import { t } from "@/lib/i18n";
import { StayCard } from "./StayCard";
import { LiveDistance } from "./LiveDistance";

// The on-the-go view: the itinerary as it looks *right now*. Read-only by
// design — during the trip the plan is a fact to follow, not a draft to edit
// (that's what / and /options are for).

/** How many upcoming nights to show before the "show all" toggle. */
const UPCOMING_PREVIEW = 2;
/** Re-check "today" this often, so an open phone rolls over at midnight. */
const CLOCK_TICK_MS = 60_000;

export function OnTheGoView({
  stops,
  tripStart,
  tripEnd,
  optionLabel,
}: {
  stops: LiveStop[];
  tripStart: string | null;
  tripEnd: string | null;
  optionLabel: string | null;
}) {
  // "Now" is resolved after mount only: rendering it on the server would bake
  // the build-time date into the HTML and mismatch on hydration.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);

  const activeStops = useMemo(
    () => stops.filter((s) => s.status !== "SKIPPED"),
    [stops],
  );
  const navStops = useMemo(
    () =>
      activeStops.map((s) => ({
        label: stopDisplayLabel(s),
        lat: s.lat,
        lng: s.lng,
      })),
    [activeStops],
  );
  const points = useMemo(() => activeLegPoints(stops), [stops]);

  // Drive metrics come from the same Leg-cached routing the map uses, so the
  // kilometres here and on the map agree.
  const reqId = useRef(0);
  useEffect(() => {
    const pairs = pairsFrom(points);
    if (pairs.length === 0) return;
    const id = ++reqId.current;
    getRoutes(pairs)
      .then((res) => {
        if (reqId.current === id) setRoutes(res);
      })
      .catch(() => {
        if (reqId.current === id) setRoutes([]);
      });
  }, [points]);

  const legs = useMemo(() => assembleLegs(points, routes), [points, routes]);

  const schedule = useMemo(() => {
    if (!tripStart || !tripEnd) return null;
    return buildSchedule({
      tripStart: new Date(tripStart),
      tripEnd: new Date(tripEnd),
      zone: ZONES.SFO.id,
      stops: activeStops.map((s) => ({
        name: s.name,
        shortName: s.shortName,
        nights: s.nights,
      })),
      legs: legs.map((l) => ({ km: l.km, hours: l.hours })),
    });
  }, [tripStart, tripEnd, activeStops, legs]);

  const state = useMemo(
    () =>
      schedule && now
        ? resolveLiveState(schedule, now, ZONES.SFO.id)
        : null,
    [schedule, now],
  );

  /** Night index → the stop we sleep at that night (and so its hotel, if any). */
  const stopForNight = useMemo(() => {
    if (!schedule) return [];
    return nightStopIndices(schedule).map((i) => activeStops[i] ?? null);
  }, [schedule, activeStops]);

  if (!schedule) {
    return (
      <Shell>
        <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
          {t.schedule.noWindow}
        </p>
      </Shell>
    );
  }

  // Pre-hydration (and for the split second before the clock resolves) we render
  // the frame without a "tonight" rather than guessing a date.
  if (!state) {
    return (
      <Shell>
        <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      </Shell>
    );
  }

  if (state.nights.length === 0) {
    return (
      <Shell>
        <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
          {t.live.noNights}
        </p>
      </Shell>
    );
  }

  const total = state.nights.length;
  const focus = state.focusIndex;
  const focusNight = focus !== null ? state.nights[focus] : null;
  const focusStop = focus !== null ? (stopForNight[focus] ?? null) : null;

  const previous = focus !== null ? state.nights.slice(0, focus) : [];
  const upcoming = focus !== null ? state.nights.slice(focus + 1) : state.nights;
  const upcomingShown = showAllUpcoming
    ? upcoming
    : upcoming.slice(0, UPCOMING_PREVIEW);

  const heroLabel =
    state.phase === "before"
      ? t.live.firstNight
      : state.phase === "after"
        ? t.live.lastNight
        : state.currentIndex !== null
          ? t.live.tonight
          : t.live.nextUp;

  return (
    <Shell>
      {state.phase === "before" && (
        <p className="rounded-xl border border-accent/25 bg-accent/10 px-4 py-2.5 text-center text-sm font-medium text-accent">
          {t.live.startsIn(state.daysUntilStart)}
        </p>
      )}
      {state.phase === "after" && (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm text-white/60">
          {t.live.tripOver}
        </p>
      )}

      {/* --- Previous nights (collapsed) ----------------------------------- */}
      {previous.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowPrevious((v) => !v)}
            className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-1 text-xs font-medium uppercase tracking-wide text-white/40 active:text-white/70"
          >
            <span>
              {t.live.previous} ({previous.length})
            </span>
            {showPrevious ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showPrevious && (
            <ol className="mt-2 flex flex-col gap-2">
              {[...previous].reverse().map((night) => (
                <li key={night.index}>
                  <StayCard
                    night={night}
                    stop={stopForNight[night.index] ?? null}
                    nightNumber={night.index + 1}
                    totalNights={total}
                    dimmed
                    navStops={navStops}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {/* --- Tonight ------------------------------------------------------- */}
      {focusNight && (
        <StayCard
          night={focusNight}
          stop={focusStop}
          nightNumber={focusNight.index + 1}
          totalNights={total}
          variant="hero"
          label={heroLabel}
          navStops={navStops}
        />
      )}

      {/* --- Where am I relative to it -------------------------------------- */}
      {focusStop && (
        <LiveDistance
          destination={{ lat: focusStop.lat, lng: focusStop.lng }}
          destinationName={focusNight?.stopName ?? focusStop.name}
        />
      )}

      {/* --- What's next ---------------------------------------------------- */}
      {upcoming.length > 0 && (
        <section>
          <h3 className="px-1 text-xs font-medium uppercase tracking-wide text-white/40">
            {t.live.upcoming}
          </h3>
          <ol className="mt-2 flex flex-col gap-2">
            {upcomingShown.map((night) => (
              <li key={night.index}>
                <StayCard
                  night={night}
                  stop={stopForNight[night.index] ?? null}
                  nightNumber={night.index + 1}
                  totalNights={total}
                  navStops={navStops}
                />
              </li>
            ))}
          </ol>
          {upcoming.length > UPCOMING_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllUpcoming((v) => !v)}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-white/60 active:bg-white/10"
            >
              {showAllUpcoming ? t.live.showLess : t.live.showAll}
              {showAllUpcoming ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </section>
      )}

      <Link
        href="/?planner=1"
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-xs font-medium text-white/40 active:bg-white/5"
      >
        <MapIcon className="h-3.5 w-3.5" />
        {optionLabel ?? t.nav.map}
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 overscroll-contain px-4 py-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      {children}
    </div>
  );
}
