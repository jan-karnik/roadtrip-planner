// Plain-text, copy/paste-friendly rendering of the itinerary for pasting into
// other tools (chat with an AI, a doc, a message) — ISO dates so it's
// unambiguous and trivially parseable, no UI chrome. Pure so it's testable
// without a DB.

import { addCivilDays, buildSchedule, type LegMetric } from "./schedule";
import { civilDateInZone } from "./timezones";

export type ExportStop = {
  name: string;
  shortName?: string | null;
  nights: number;
  status: string;
  isHotel?: boolean;
  address?: string | null;
  phone?: string | null;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * One line per active (non-skipped) stop: an ISO date or date range plus the
 * name, `(N nights)` for a stay or `(průjezd)` for a same-day pass-through.
 * Stop order and `nights` must match the active-only stop list — skipped
 * stops are dropped entirely rather than shown with a status marker, since
 * this is meant to read as the plan actually being followed.
 */
export function buildExportLines(
  stops: ExportStop[],
  tripStart: Date,
  zone: string,
): string[] {
  const active = stops.filter((s) => s.status !== "SKIPPED");
  const arriveCivil = civilDateInZone(tripStart, zone);

  let cumulativeNights = 0;
  const lines: string[] = [];
  for (const stop of active) {
    const date = addCivilDays(arriveCivil, cumulativeNights);
    if (stop.nights > 0) {
      const last = addCivilDays(arriveCivil, cumulativeNights + stop.nights - 1);
      const range =
        stop.nights === 1 ? isoDate(date) : `${isoDate(date)} – ${isoDate(last)}`;
      lines.push(`${range}  ${stop.name}  (${stop.nights} nights)`);
    } else {
      lines.push(`${isoDate(date)}  ${stop.name}  (pass-through)`);
    }
    cumulativeNights += stop.nights;
  }
  return lines;
}

export function buildExportText({
  stops,
  tripStart,
  zone,
  title,
}: {
  stops: ExportStop[];
  tripStart: Date;
  zone: string;
  title: string;
}): string {
  const lines = buildExportLines(stops, tripStart, zone);
  return [title, "", ...lines].join("\n");
}

function formatExportDuration(hours: number): string {
  const total = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/**
 * Day-by-day export: ISO date, optional drive line (km + time), sleep line with
 * hotel address/phone when the stop is a booked hotel.
 */
export function buildDayByDayExportLines({
  tripStart,
  tripEnd,
  zone,
  stops,
  legs,
}: {
  tripStart: Date;
  tripEnd: Date;
  zone: string;
  stops: ExportStop[];
  legs: LegMetric[];
}): string[] {
  const active = stops.filter((s) => s.status !== "SKIPPED");
  const schedule = buildSchedule({
    tripStart,
    tripEnd,
    zone,
    stops: active.map((s) => ({
      name: s.name,
      shortName: s.shortName,
      nights: s.nights,
    })),
    legs,
  });

  const stopByLabel = new Map(
    active.map((s) => [s.shortName ?? s.name, s]),
  );

  const lines: string[] = [];
  for (const night of schedule.nights) {
    lines.push(isoDate(night.date));
    if (night.drive) {
      lines.push(
        `  drive: ${night.drive.fromName} → ${night.stopName}  (${Math.round(night.drive.km)} km, ${formatExportDuration(night.drive.hours)})`,
      );
    } else if (night.isArrivalNight) {
      lines.push(`  (no drive)`);
    } else {
      lines.push(`  rest day at ${night.stopName}`);
    }
    const stop = stopByLabel.get(night.stopName);
    const hotelBits = [
      stop?.isHotel ? "hotel" : null,
      stop?.address ?? null,
      stop?.phone ?? null,
    ].filter(Boolean);
    lines.push(
      `  sleep: ${night.stopName}${hotelBits.length ? `  [${hotelBits.join(" · ")}]` : ""}`,
    );
    lines.push("");
  }
  return lines;
}

export function buildDetailedExportText({
  stops,
  tripStart,
  tripEnd,
  zone,
  title,
  legs,
}: {
  stops: ExportStop[];
  tripStart: Date;
  tripEnd: Date;
  zone: string;
  title: string;
  legs: LegMetric[];
}): string {
  const summary = buildExportLines(stops, tripStart, zone);
  const dayByDay = buildDayByDayExportLines({
    tripStart,
    tripEnd,
    zone,
    stops,
    legs,
  });
  return [
    title,
    "",
    "--- Stops (date ranges) ---",
    ...summary,
    "",
    "--- Day by day ---",
    ...dayByDay,
  ].join("\n");
}
