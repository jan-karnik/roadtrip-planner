// Day-by-day schedule derivation. Pure: turns the ordered ACTIVE stops (each
// with a nights count) plus the per-leg drive metrics into a per-night calendar,
// walking nights from the trip's arrival date.
//
// Convention: a leg's drive lands on the ARRIVAL day at the next stop — you
// leave after the last night, drive, and sleep at the new place. So each leg's
// hours attach to exactly one calendar day, and `Σ nights == trip nights` is the
// fit check. A 0-night stop is a same-day pass-through: its inbound leg rolls up
// into the next stop where we actually sleep.

import { civilDateInZone, nightsBetween } from "./timezones";

export type ScheduleStop = {
  name: string;
  shortName?: string | null;
  nights: number;
};

export type LegMetric = { km: number; hours: number };

export type ScheduleDrive = {
  km: number;
  hours: number;
  /** Where the day's driving began (the last stop we slept at). */
  fromName: string;
  /** 0-based indices into the legs array (= MapView feature-state ids). Multiple when 0-night pass-throughs are rolled up. */
  legIndices: number[];
};

export type ScheduleNight = {
  /** 0-based night index from arrival. */
  index: number;
  /** Civil date of this night, anchored to UTC noon (DST-proof for date-only). */
  date: Date;
  /** Where we sleep this night. */
  stopName: string;
  /** True on the first night at a stop (a drive may have happened today). */
  isArrivalNight: boolean;
  /** The drive that delivered us here today, if any (rolled up across any
   *  0-night pass-through stops since the last sleep). */
  drive?: ScheduleDrive;
};

/**
 * The night span a single stop occupies, aligned positionally to the `stops`
 * input of `buildSchedule`. `firstDate`/`lastDate` are null for a 0-night
 * pass-through. Used by the map to label where (and on which dates) we sleep.
 */
export type StopNightRange = {
  nights: number;
  firstDate: Date | null;
  lastDate: Date | null;
};

export type Schedule = {
  nights: ScheduleNight[];
  /** Per-stop night spans, positionally aligned to the input `stops`. */
  perStop: StopNightRange[];
  /** Σ of every stop's nights. */
  totalNights: number;
  /** Nights available in the trip window (arrival → departure). */
  tripNights: number;
  /** totalNights − tripNights: 0 = exact fit, >0 = over, <0 = under. */
  fit: number;
};

export function addCivilDays(
  base: { year: number; month: number; day: number },
  offset: number,
): Date {
  return new Date(Date.UTC(base.year, base.month - 1, base.day + offset, 12));
}

/**
 * Build the per-night schedule. `legs[i]` is the drive from `stops[i]` to
 * `stops[i+1]`; `stops` must be the ordered active stops the legs were assembled
 * over. `tripStart`/`tripEnd`/`zone` define the fit window.
 */
export function buildSchedule({
  tripStart,
  tripEnd,
  zone,
  stops,
  legs,
}: {
  tripStart: Date;
  tripEnd: Date;
  zone: string;
  stops: ScheduleStop[];
  legs: LegMetric[];
}): Schedule {
  const arriveCivil = civilDateInZone(tripStart, zone);
  const tripNights = nightsBetween(tripStart, tripEnd, zone);

  const nights: ScheduleNight[] = [];
  const perStop: StopNightRange[] = [];
  let cursor = 0; // night index from arrival
  // The trip's origin (the first active stop, e.g. SFO airport). Used as the
  // drive's "from" when we reach the first overnight without having slept yet —
  // otherwise a 0-night origin's outbound leg would be dropped.
  const originLabel =
    stops.length > 0 ? (stops[0].shortName ?? stops[0].name) : null;
  let lastSleepName: string | null = null;
  // Drive accrued since the last sleep (rolls up 0-night pass-throughs).
  let pending = { km: 0, hours: 0 };
  let pendingLegIndices: number[] = [];

  for (let s = 0; s < stops.length; s++) {
    // Accrue the inbound leg (stops[s-1] → stops[s]).
    if (s > 0 && legs[s - 1]) {
      pending.km += legs[s - 1].km;
      pending.hours += legs[s - 1].hours;
      pendingLegIndices.push(s - 1);
    }
    const stop = stops[s];
    const label = stop.shortName ?? stop.name;
    const fromName = lastSleepName ?? originLabel;
    const startCursor = cursor;

    for (let n = 0; n < stop.nights; n++) {
      const isArrivalNight = n === 0;
      const drive =
        isArrivalNight && fromName != null && pending.hours > 0
          ? { km: pending.km, hours: pending.hours, fromName, legIndices: [...pendingLegIndices] }
          : undefined;
      nights.push({
        index: cursor,
        date: addCivilDays(arriveCivil, cursor),
        stopName: label,
        isArrivalNight,
        drive,
      });
      if (isArrivalNight) {
        pending = { km: 0, hours: 0 };
        pendingLegIndices = [];
      }
      cursor++;
    }

    perStop.push({
      nights: stop.nights,
      firstDate: stop.nights > 0 ? addCivilDays(arriveCivil, startCursor) : null,
      lastDate: stop.nights > 0 ? addCivilDays(arriveCivil, cursor - 1) : null,
    });

    if (stop.nights > 0) lastSleepName = label;
  }

  const totalNights = cursor;
  return { nights, perStop, totalNights, tripNights, fit: totalNights - tripNights };
}

const CIVIL_FMT = new Intl.DateTimeFormat("cs-CZ", {
  weekday: "short",
  day: "numeric",
  month: "numeric",
  timeZone: "UTC",
});

/** Format a UTC-noon civil date for display, e.g. "st 12. 8.". */
export function formatCivilDate(date: Date): string {
  return CIVIL_FMT.format(date);
}

const CIVIL_FMT_SHORT = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  timeZone: "UTC",
});

/** Compact, weekday-less civil date, e.g. "12. 8.". */
export function formatCivilDateShort(date: Date): string {
  return CIVIL_FMT_SHORT.format(date);
}

/** Inclusive date range, e.g. "12. – 29. 8." (collapses to one date if equal).
 *  For a *stay* — where we leave the morning after the last night — use
 *  `formatStaySpan` instead. */
export function formatCivilDateRange(first: Date, last: Date): string {
  const a = formatCivilDateShort(first);
  const b = formatCivilDateShort(last);
  return a === b ? a : `${a} – ${b}`;
}

const CIVIL_FMT_DAY = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  timeZone: "UTC",
});

/**
 * A stay as check-in → check-out, e.g. a single night on 15. 8. reads
 * "15. → 16. 8." — `last` is the last night *slept*, so we leave the morning
 * after. The month is printed once when both dates share it.
 */
export function formatStaySpan(first: Date, last: Date): string {
  const out = new Date(last.getTime());
  out.setUTCDate(out.getUTCDate() + 1);
  if (out.getUTCMonth() === first.getUTCMonth()) {
    // cs-CZ already renders the day with its ordinal dot ("15.").
    return `${CIVIL_FMT_DAY.format(first)} → ${formatCivilDateShort(out)}`;
  }
  return `${formatCivilDateShort(first)} → ${formatCivilDateShort(out)}`;
}
