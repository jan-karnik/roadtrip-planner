// Distance units. The app shows kilometers first and miles on hover; the
// preferred primary unit is user-configurable (see PreferencesProvider).

export const KM_TO_MI = 0.621371;

export type DistanceUnit = "km" | "mi";
export const DISTANCE_UNITS: readonly DistanceUnit[] = ["km", "mi"] as const;

// Czech number formatting (space thousands separator) to match the cs UI.
const NUMBER_FMT = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });

export function convertKm(km: number, unit: DistanceUnit): number {
  return unit === "mi" ? km * KM_TO_MI : km;
}

/** e.g. formatDistance(1741, "mi") → "1 082 mi". */
export function formatDistance(km: number, unit: DistanceUnit): string {
  return `${NUMBER_FMT.format(Math.round(convertKm(km, unit)))} ${unit}`;
}
