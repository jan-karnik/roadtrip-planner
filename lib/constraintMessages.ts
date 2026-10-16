import { t } from "./i18n";
import type { ConstraintViolation } from "./itineraryConstraints";

/** Map a constraint violation to UI copy (client + server). */
export function constraintViolationMessage(v: ConstraintViolation): string {
  if (v.code === "night_fit") {
    const m = /have (\d+), need (\d+)/.exec(v.message);
    if (m) return t.errors.nightFitOff(Number(m[1]), Number(m[2]));
  }
  if (v.code === "arrival_drive") {
    const m = /drives ([\d.]+)h \(>([\d.]+)h/.exec(v.message);
    if (m) return t.errors.arrivalDriveTooLong(Number(m[1]), Number(m[2]));
  }
  if (v.code === "daily_ceiling") {
    const m = /drives ([\d.]+)h \(>([\d.]+)h/.exec(v.message);
    if (m) return t.errors.dailyDriveTooLong(Number(m[1]), Number(m[2]));
  }
  if (v.code === "booked_nights") {
    const m = /"([^"]+)" nights \d+ < booked (\d+)/.exec(v.message);
    if (m) return t.errors.bookedNightsBelow(m[1], Number(m[2]));
  }
  if (v.code === "booked_skip") {
    const m = /"([^"]+)"/.exec(v.message);
    if (m) return t.errors.bookedStopSkipped(m[1]);
  }
  if (v.code === "soft_daily") {
    const m = /drives ([\d.]+)h \(>([\d.]+)h/.exec(v.message);
    if (m) return t.errors.softDailyDrive(Number(m[1]), Number(m[2]));
  }
  return v.message;
}
