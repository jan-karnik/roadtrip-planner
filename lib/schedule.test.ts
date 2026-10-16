import { describe, expect, it } from "vitest";
import { ZONES, zonedWallClockToUtc, nightsBetween } from "./timezones";
import {
  buildSchedule,
  formatStaySpan,
  type ScheduleStop,
  type LegMetric,
} from "./schedule";

// A sample 17-night window: arrive Aug 12 18:00, depart Aug 29 13:00 (SFO).
const TRIP_START = zonedWallClockToUtc(2026, 8, 12, 18, 0, ZONES.SFO.id);
const TRIP_END = zonedWallClockToUtc(2026, 8, 29, 13, 0, ZONES.SFO.id);
const ZONE = ZONES.SFO.id;

function schedule(stops: ScheduleStop[], legs: LegMetric[] = []) {
  return buildSchedule({
    tripStart: TRIP_START,
    tripEnd: TRIP_END,
    zone: ZONE,
    stops,
    legs,
  });
}

/** A night's civil date as ISO yyyy-mm-dd (dates are anchored to UTC noon). */
const dateOf = (d: Date) => d.toISOString().slice(0, 10);

describe("nightsBetween", () => {
  it("counts 17 nights across the trip window", () => {
    expect(nightsBetween(TRIP_START, TRIP_END, ZONE)).toBe(17);
  });

  it("ignores the wall-clock time of day, counting whole nights", () => {
    // Same calendar dates, different times → still 17 nights.
    const lateStart = zonedWallClockToUtc(2026, 8, 12, 23, 30, ZONES.SFO.id);
    const earlyEnd = zonedWallClockToUtc(2026, 8, 29, 1, 0, ZONES.SFO.id);
    expect(nightsBetween(lateStart, earlyEnd, ZONE)).toBe(17);
  });
});

describe("buildSchedule — fit", () => {
  it("is an exact fit when Σ nights equals the trip nights", () => {
    const s = schedule([
      { name: "SF", nights: 10 },
      { name: "LA", nights: 7 },
    ]);
    expect(s.totalNights).toBe(17);
    expect(s.tripNights).toBe(17);
    expect(s.fit).toBe(0);
  });

  it("reports a positive fit when over and negative when under", () => {
    expect(schedule([{ name: "A", nights: 18 }]).fit).toBe(1);
    expect(schedule([{ name: "A", nights: 16 }]).fit).toBe(-1);
  });
});

describe("buildSchedule — date walk", () => {
  it("dates nights consecutively from the arrival civil date", () => {
    const s = schedule([{ name: "SF", nights: 3 }]);
    expect(s.nights.map((n) => dateOf(n.date))).toEqual([
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
    ]);
  });

  it("emits one row per night across all stops in order", () => {
    const s = schedule(
      [
        { name: "SF", nights: 2 },
        { name: "Sequoia", nights: 1 },
      ],
      [{ km: 400, hours: 4 }],
    );
    expect(s.nights).toHaveLength(3);
    expect(s.nights.map((n) => n.stopName)).toEqual([
      "SF",
      "SF",
      "Sequoia",
    ]);
    expect(s.nights.map((n) => dateOf(n.date))).toEqual([
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
    ]);
  });
});

describe("buildSchedule — drive attribution", () => {
  it("attaches a leg's drive to the arrival night only, not rest nights", () => {
    const s = schedule(
      [
        { name: "SF", nights: 1 },
        { name: "LA", nights: 2 },
      ],
      [{ km: 600, hours: 6 }],
    );
    // SF arrival = flight, no drive.
    expect(s.nights[0].drive).toBeUndefined();
    // LA arrival night carries the SF→LA drive...
    expect(s.nights[1].isArrivalNight).toBe(true);
    expect(s.nights[1].drive).toEqual({
      km: 600,
      hours: 6,
      fromName: "SF",
      legIndices: [0],
    });
    // ...but the second LA night is a rest night.
    expect(s.nights[2].isArrivalNight).toBe(false);
    expect(s.nights[2].drive).toBeUndefined();
  });

  it("attributes the drive out of a 0-night origin to the origin name", () => {
    const s = schedule(
      [
        { name: "San Francisco", shortName: "SFO", nights: 0 }, // land + drive on
        { name: "Yosemite", nights: 1 },
      ],
      [{ km: 100, hours: 1.5 }],
    );
    expect(s.nights).toHaveLength(1);
    expect(s.nights[0].drive).toEqual({
      km: 100,
      hours: 1.5,
      fromName: "SFO",
      legIndices: [0],
    });
  });

  it("rolls up a 0-night pass-through into the next sleep", () => {
    const s = schedule(
      [
        { name: "SF", nights: 1 },
        { name: "Viewpoint", nights: 0 }, // pass through, don't sleep
        { name: "LA", nights: 1 },
      ],
      [
        { km: 100, hours: 1 }, // SF → Viewpoint
        { km: 500, hours: 5 }, // Viewpoint → LA
      ],
    );
    expect(s.nights).toHaveLength(2);
    // The day we reach LA includes both legs, starting from SF.
    expect(s.nights[1].drive).toEqual({
      km: 600,
      hours: 6,
      fromName: "SF",
      legIndices: [0, 1],
    });
  });

  it("prefers shortName for labels when present", () => {
    const s = schedule([
      { name: "San Francisco, California", shortName: "SF", nights: 1 },
    ]);
    expect(s.nights[0].stopName).toBe("SF");
  });
});

describe("buildSchedule — perStop ranges", () => {
  it("dates each stop's first/last night and nulls pass-throughs", () => {
    const s = schedule(
      [
        { name: "SF", nights: 2 },
        { name: "Viewpoint", nights: 0 },
        { name: "LA", nights: 1 },
      ],
      [
        { km: 100, hours: 1 },
        { km: 500, hours: 5 },
      ],
    );
    expect(s.perStop).toHaveLength(3);
    // SF: nights 0–1 → Aug 12–13.
    expect(s.perStop[0].nights).toBe(2);
    expect(dateOf(s.perStop[0].firstDate!)).toBe("2026-08-12");
    expect(dateOf(s.perStop[0].lastDate!)).toBe("2026-08-13");
    // Pass-through has no dates.
    expect(s.perStop[1]).toEqual({ nights: 0, firstDate: null, lastDate: null });
    // LA: night 2 → Aug 14 (single night collapses first==last).
    expect(dateOf(s.perStop[2].firstDate!)).toBe("2026-08-14");
    expect(dateOf(s.perStop[2].lastDate!)).toBe("2026-08-14");
  });
});

/** A UTC-noon civil date, the anchoring buildSchedule uses. */
const civil = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));

describe("formatStaySpan", () => {
  it("reads as check-in → check-out (the morning after the last night)", () => {
    expect(formatStaySpan(civil(2026, 8, 15), civil(2026, 8, 15))).toBe("15. → 16. 8.");
    expect(formatStaySpan(civil(2026, 8, 12), civil(2026, 8, 14))).toBe("12. → 15. 8.");
  });

  it("spells out both months when check-out rolls into the next one", () => {
    expect(formatStaySpan(civil(2026, 8, 30), civil(2026, 8, 31))).toBe(
      "30. 8. → 1. 9.",
    );
  });
});
