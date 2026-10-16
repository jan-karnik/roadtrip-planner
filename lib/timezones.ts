// Single source of truth for the two reference time zones in this trip:
// the travellers' home (Prague) and the destination (SFO / US west coast).
// Used by the seed, server components, and the client TimeStamp component.

export const ZONES = {
  SFO: {
    id: "America/Los_Angeles",
    label: "SFO",
    color: "#f59e0b", // amber — destination
  },
  PRG: {
    id: "Europe/Prague",
    label: "Prague",
    color: "#a78bfa", // violet — home
  },
} as const;

export type ZoneKey = keyof typeof ZONES;

const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = FORMATTERS.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    });
    FORMATTERS.set(timeZone, fmt);
  }
  return fmt;
}

/** Format an instant in a given IANA zone, e.g. "Wed 12 Aug, 18:00". */
export function formatInZone(instant: Date, timeZone: string): string {
  return formatter(timeZone).format(instant);
}

/** Format an instant in both reference zones, keyed by zone. */
export function formatBothZones(instant: Date): Record<ZoneKey, string> {
  return {
    SFO: formatInZone(instant, ZONES.SFO.id),
    PRG: formatInZone(instant, ZONES.PRG.id),
  };
}

/** The civil (wall-clock) calendar date an instant falls on in a given zone. */
export function civilDateInZone(
  instant: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** The wall-clock hour of day (0–23.999…) an instant falls on in a given zone. */
export function hourOfDayInZone(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour + minute / 60;
}

/** Whole days from one civil date to another (UTC-noon anchored, DST-proof). */
function civilDayNumber(d: { year: number; month: number; day: number }): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day, 12) / 86_400_000);
}

/**
 * Number of nights between two instants, counted by their civil date in `zone`
 * (ignores the wall-clock time of day). E.g. arrive Aug 12, depart Aug 29
 * (SFO) → 17.
 */
export function nightsBetween(
  start: Date,
  end: Date,
  timeZone: string,
): number {
  return (
    civilDayNumber(civilDateInZone(end, timeZone)) -
    civilDayNumber(civilDateInZone(start, timeZone))
  );
}

/** Offset (ms) between a wall-clock instant and how `timeZone` renders it. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}

/**
 * Convert a wall-clock time *in a given zone* to the true UTC instant.
 * e.g. zonedWallClockToUtc(2026, 8, 12, 18, 0, ZONES.SFO.id) → the instant
 * that reads 18:00 in San Francisco. Used by the seed to anchor trip times.
 */
export function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess - offset);
}
