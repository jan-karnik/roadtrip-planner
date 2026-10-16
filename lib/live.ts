// "Where are we right now" — the derivation behind the on-the-go view (/live).
//
// Pure: takes the schedule (lib/schedule.ts) and the current instant, and decides
// which night is *tonight*, which are behind us, and which are ahead.
//
// The hotel is NOT resolved here. Accommodation lives on the stop itself
// (`OptionStop.isHotel`), so the night → hotel link is just the night → stop link
// that `nightStopIndices` already provides. There is deliberately no separate
// date-keyed lookup: matching a hotel to a night by date is what once let the
// itinerary claim a night in one town while the booking was 95 km away.
//
// The trip's own timezone is what "today" means here: at 23:00 in Prague it is
// still mid-afternoon in California and you have not yet reached tonight's hotel,
// so the day must roll over on SFO's clock, not the phone's.

import { civilDateInZone } from "./timezones";
import type { Schedule, ScheduleNight } from "./schedule";

export type NightPhase = "past" | "current" | "future";

export type LiveNight = ScheduleNight & {
  phase: NightPhase;
};

export type TripPhase = "before" | "during" | "after";

export type LiveState = {
  phase: TripPhase;
  /** "Today" as a UTC-noon civil date in the trip's zone. */
  todayDate: Date;
  /** Index into `nights` of the night we sleep tonight, or null outside the trip. */
  currentIndex: number | null;
  /**
   * The night the view leads with: tonight during the trip, the first night
   * before it starts, the last night after it ends. Null only if there are no
   * nights at all.
   */
  focusIndex: number | null;
  /** Whole nights from today to the first night (>0 only when phase is "before"). */
  daysUntilStart: number;
  nights: LiveNight[];
};

const DAY_MS = 86_400_000;

/** The civil date of `instant` in `zone`, anchored to UTC noon. */
export function civilNoon(instant: Date, zone: string): Date {
  const { year, month, day } = civilDateInZone(instant, zone);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** Whole days between two UTC-noon civil dates (b − a). */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/**
 * Resolve the live state of the trip at `now`.
 *
 * `zone` must be the trip's zone (ZONES.SFO.id) — see the note at the top of the
 * file about why the phone's own timezone would be wrong.
 */
export function resolveLiveState(
  schedule: Schedule,
  now: Date,
  zone: string,
): LiveState {
  const todayDate = civilNoon(now, zone);
  const today = todayDate.getTime();

  const nights: LiveNight[] = schedule.nights.map((night) => {
    const t = night.date.getTime();
    return {
      ...night,
      phase: t === today ? "current" : t < today ? "past" : "future",
    };
  });

  const currentIndex = nights.findIndex((n) => n.phase === "current");
  const first = nights[0];
  const last = nights[nights.length - 1];

  let phase: TripPhase;
  if (!first) phase = "before";
  else if (today < first.date.getTime()) phase = "before";
  else if (today > last.date.getTime()) phase = "after";
  else phase = "during";

  // Mid-trip a night can still be missing from the calendar (a gap in the plan);
  // lead with the next one ahead rather than dropping to nothing.
  const focusIndex =
    currentIndex !== -1
      ? currentIndex
      : phase === "after"
        ? nights.length > 0
          ? nights.length - 1
          : null
        : nights.findIndex((n) => n.phase === "future") !== -1
          ? nights.findIndex((n) => n.phase === "future")
          : null;

  return {
    phase,
    todayDate,
    currentIndex: currentIndex === -1 ? null : currentIndex,
    focusIndex,
    daysUntilStart: first ? Math.max(0, daysBetween(todayDate, first.date)) : 0,
    nights,
  };
}

/**
 * For each night, the index of the stop we sleep at — into the same *active
 * stops* array the schedule was built from. `Schedule` names the stop but drops
 * everything else about it (coordinates, booked nights), which the on-the-go
 * view needs; this walks `perStop` to recover the link.
 */
export function nightStopIndices(schedule: Schedule): number[] {
  const out: number[] = [];
  schedule.perStop.forEach((stop, stopIndex) => {
    for (let n = 0; n < stop.nights; n++) out.push(stopIndex);
  });
  return out;
}

/**
 * A Google Maps link that searches for a place by name + address. Used for a
 * hotel stop, where the postal address navigates more reliably than the
 * geocoder's coordinates (which can land on the parcel rather than the entrance).
 */
export function googleMapsUrl(target: {
  name: string;
  address?: string | null;
}): string {
  const query = [target.name, target.address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** A Google Maps link for a coordinate (used for itinerary stops). */
export function googleMapsUrlForCoords(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
