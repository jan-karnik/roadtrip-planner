import {
  activeConstraintStops,
  checkBookedNights,
  dailyDriveHours,
  validateItineraryHardConstraints,
  type ConstraintStop,
  type ConstraintViolation,
  type TripWindow,
  DAILY_SOFT_CEILING_HOURS,
} from "./itineraryConstraints";
import type { LegMetric } from "./schedule";

/** All save-blocking violations for a draft (mirrors saveOption checks). */
export function listSaveBlockingViolations(
  stops: ConstraintStop[],
  legs: LegMetric[],
  window: TripWindow | null,
): ConstraintViolation[] {
  const booked = checkBookedNights(stops);
  if (booked.length > 0) return booked;
  if (!window) return [];
  const active = activeConstraintStops(stops);
  return validateItineraryHardConstraints(active, legs, window);
}

/** Brief soft ceiling — warn in the planner, do not block save. */
export function softDailyDriveWarnings(
  stops: ConstraintStop[],
  legs: LegMetric[],
): ConstraintViolation[] {
  const active = activeConstraintStops(stops);
  const days = dailyDriveHours(active, legs);
  return days
    .filter((h) => h > DAILY_SOFT_CEILING_HOURS + 1e-6)
    .map((h) => ({
      code: "soft_daily",
      message: `a day drives ${h.toFixed(1)}h (>${DAILY_SOFT_CEILING_HOURS}h soft target)`,
    }));
}

export { DAILY_SOFT_CEILING_HOURS };
