// Infer the civil-time zone at a stop along the west-coast loop. The app
// already shows Prague + SFO everywhere; on the ground, park gates and tour
// slots follow *local* civil time — notably Arizona (no DST) vs Utah (MDT).

const PACIFIC = "America/Los_Angeles";
const MOUNTAIN = "America/Denver";
const ARIZONA = "America/Phoenix";

export type StopCoords = {
  name: string;
  lat: number;
  lng: number;
};

/**
 * Best-effort IANA zone for itinerary stops (Nominatim `display_name`s + coords).
 * Not perfect near borders; good enough for August 2026 planning reminders.
 */
export function localTimeZoneForStop(stop: StopCoords): string {
  const n = stop.name;
  if (/\bUtah\b/i.test(n)) return MOUNTAIN;
  if (/\bNevada\b/i.test(n) && stop.lng >= -115.5) return MOUNTAIN;
  if (/\bPage\b|\bNavajo\b|\bMonument Valley\b/i.test(n)) return MOUNTAIN;
  if (/\bArizona\b/i.test(n)) return ARIZONA;
  if (/\bColorado\b|\bNew Mexico\b|\bWyoming\b|\bIdaho\b|\bMontana\b/i.test(n))
    return MOUNTAIN;

  // Geographic fallback (rough envelopes along our route).
  if (stop.lng >= -114.2 && stop.lat >= 37) return MOUNTAIN;
  if (stop.lng >= -114.8 && stop.lat < 37.5 && stop.lat > 31) return ARIZONA;

  return PACIFIC;
}

const SHORT_TZ = new Map<string, Intl.DateTimeFormat>();

function shortZoneFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = SHORT_TZ.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    SHORT_TZ.set(timeZone, fmt);
  }
  return fmt;
}

/** Format an instant in the stop's local zone, e.g. "09:30 MDT". */
export function formatStopLocalTime(instant: Date, stop: StopCoords): string {
  const zone = localTimeZoneForStop(stop);
  return shortZoneFormatter(zone).format(instant);
}
