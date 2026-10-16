// Shared hard-constraint checks for saved Variants: night fit against the trip
// window, booked-night locks, and drive-time safety caps.

import { buildSchedule, type LegMetric } from "./schedule";

/** Short, safe arrival-day drive (e.g. after a long-haul flight). */
export const ARRIVAL_MAX_HOURS = 1.6;
/** Feasibility/safety cap on any single day's driving. */
export const DAILY_HARD_CEILING_HOURS = 9;
/** Discouraged pacing target (penalized in optimizer, warned in planner). */
export const DAILY_SOFT_CEILING_HOURS = 6;

export type ConstraintStop = {
  name: string;
  shortName?: string | null;
  nights: number;
  bookedNights?: number;
  status: string;
};

export type TripWindow = {
  start: Date;
  end: Date;
  zone: string;
};

export type ConstraintViolation = {
  code: string;
  /** English dev message (logs/tests). */
  message: string;
};

/** Active stops only — same rule as routing / schedule assembly. */
export function activeConstraintStops(stops: ConstraintStop[]): ConstraintStop[] {
  return stops.filter((s) => s.status !== "SKIPPED");
}

/**
 * Drive hours per calendar day (overnight→overnight rollup). `days[0]` is the
 * arrival day; a trailing entry is the departure-day drive after the last sleep.
 */
export function dailyDriveHours(
  stops: ConstraintStop[],
  legs: LegMetric[],
): number[] {
  const days: number[] = [];
  let pending = 0;
  for (let s = 0; s < stops.length; s++) {
    if (s > 0 && legs[s - 1]) pending += legs[s - 1].hours;
    if (stops[s].nights > 0) {
      days.push(pending);
      pending = 0;
    }
  }
  if (pending > 1e-9) days.push(pending);
  return days;
}

/** Booked accommodation nights cannot be edited away in the UI — enforce server-side too. */
export function checkBookedNights(stops: ConstraintStop[]): ConstraintViolation[] {
  const v: ConstraintViolation[] = [];
  stops.forEach((s, i) => {
    const booked = s.bookedNights ?? 0;
    if (booked <= 0) return;
    const label = s.shortName ?? s.name;
    if (s.status === "SKIPPED") {
      v.push({
        code: "booked_skip",
        message: `stop ${i} "${label}" has ${booked} booked nights but is skipped`,
      });
      return;
    }
    if (s.nights < booked) {
      v.push({
        code: "booked_nights",
        message: `stop ${i} "${label}" nights ${s.nights} < booked ${booked}`,
      });
    }
  });
  return v;
}

export function checkNightFit(
  stops: ConstraintStop[],
  legs: LegMetric[],
  window: TripWindow,
): ConstraintViolation | null {
  const active = activeConstraintStops(stops);
  const schedule = buildSchedule({
    tripStart: window.start,
    tripEnd: window.end,
    zone: window.zone,
    stops: active.map((s) => ({
      name: s.name,
      shortName: s.shortName,
      nights: s.nights,
    })),
    legs,
  });
  if (schedule.fit === 0) return null;
  return {
    code: "night_fit",
    message: `night fit off by ${schedule.fit} (have ${schedule.totalNights}, need ${schedule.tripNights})`,
  };
}

export function checkArrivalDayDrive(
  stops: ConstraintStop[],
  legs: LegMetric[],
): ConstraintViolation | null {
  const active = activeConstraintStops(stops);
  const days = dailyDriveHours(active, legs);
  if (days[0] !== undefined && days[0] > ARRIVAL_MAX_HOURS + 1e-6) {
    return {
      code: "arrival_drive",
      message: `arrival day drives ${days[0].toFixed(1)}h (>${ARRIVAL_MAX_HOURS}h cap)`,
    };
  }
  return null;
}

export function checkDailyHardCeiling(
  stops: ConstraintStop[],
  legs: LegMetric[],
): ConstraintViolation | null {
  const active = activeConstraintStops(stops);
  const days = dailyDriveHours(active, legs);
  for (const h of days) {
    if (h > DAILY_HARD_CEILING_HOURS + 1e-6) {
      return {
        code: "daily_ceiling",
        message: `a day drives ${h.toFixed(1)}h (>${DAILY_HARD_CEILING_HOURS}h ceiling)`,
      };
    }
  }
  return null;
}

/** All hard checks currently enforced on save. */
export function validateItineraryHardConstraints(
  stops: ConstraintStop[],
  legs: LegMetric[],
  window: TripWindow,
): ConstraintViolation[] {
  const v: ConstraintViolation[] = [];
  const fit = checkNightFit(stops, legs, window);
  if (fit) v.push(fit);
  const arrival = checkArrivalDayDrive(stops, legs);
  if (arrival) v.push(arrival);
  const daily = checkDailyHardCeiling(stops, legs);
  if (daily) v.push(daily);
  return v;
}
