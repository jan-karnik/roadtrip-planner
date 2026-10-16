import { describe, expect, it } from "vitest";
import { zonedWallClockToUtc, ZONES } from "./timezones";
import {
  ARRIVAL_MAX_HOURS,
  DAILY_HARD_CEILING_HOURS,
  checkArrivalDayDrive,
  checkDailyHardCeiling,
  checkNightFit,
  dailyDriveHours,
  checkBookedNights,
  validateItineraryHardConstraints,
} from "./itineraryConstraints";

const WINDOW = {
  start: zonedWallClockToUtc(2026, 8, 12, 18, 0, ZONES.SFO.id),
  end: zonedWallClockToUtc(2026, 8, 29, 13, 0, ZONES.SFO.id),
  zone: ZONES.SFO.id,
};

describe("dailyDriveHours", () => {
  it("rolls pass-through legs into the next sleep day", () => {
    const stops = [
      { name: "A", nights: 0, status: "PLANNED" },
      { name: "B", nights: 1, status: "PLANNED" },
    ];
    const legs = [{ km: 100, hours: 2.2 }];
    expect(dailyDriveHours(stops, legs)).toEqual([2.2]);
  });
});

describe("checkBookedNights", () => {
  it("rejects nights below bookedNights or skipping a booked stop", () => {
    expect(
      checkBookedNights([
        { name: "Hotel A", nights: 1, bookedNights: 2, status: "PLANNED" },
      ])[0]?.code,
    ).toBe("booked_nights");
    expect(
      checkBookedNights([
        { name: "Hotel B", nights: 2, bookedNights: 2, status: "SKIPPED" },
      ])[0]?.code,
    ).toBe("booked_skip");
  });
});

describe("checkNightFit", () => {
  it("passes when Σ nights equals the trip window", () => {
    const stops = [{ name: "A", nights: 17, status: "PLANNED" }];
    expect(checkNightFit(stops, [], WINDOW)).toBeNull();
  });

  it("fails when over or under the window", () => {
    const over = [{ name: "A", nights: 18, status: "PLANNED" }];
    expect(checkNightFit(over, [], WINDOW)?.code).toBe("night_fit");
    const under = [{ name: "A", nights: 16, status: "PLANNED" }];
    expect(checkNightFit(under, [], WINDOW)?.code).toBe("night_fit");
  });

  it("ignores skipped stops in the night sum", () => {
    const stops = [
      { name: "A", nights: 17, status: "PLANNED" },
      { name: "B", nights: 5, status: "SKIPPED" },
    ];
    expect(checkNightFit(stops, [], WINDOW)).toBeNull();
  });
});

describe("checkArrivalDayDrive", () => {
  it("rejects a long first-day haul", () => {
    const stops = [
      { name: "SFO", nights: 0, status: "PLANNED" },
      { name: "Far", nights: 17, status: "PLANNED" },
    ];
    const legs = [{ km: 500, hours: ARRIVAL_MAX_HOURS + 1 }];
    expect(checkArrivalDayDrive(stops, legs)?.code).toBe("arrival_drive");
  });
});

describe("checkDailyHardCeiling", () => {
  it("rejects any calendar day over the hard cap", () => {
    const stops = [
      { name: "Origin", nights: 0, status: "PLANNED" },
      { name: "Far", nights: 17, status: "PLANNED" },
    ];
    const legs = [{ km: 900, hours: DAILY_HARD_CEILING_HOURS + 0.5 }];
    expect(checkDailyHardCeiling(stops, legs)?.code).toBe("daily_ceiling");
  });
});

describe("validateItineraryHardConstraints", () => {
  it("returns no violations for a minimal valid itinerary", () => {
    const stops = [
      { name: "Origin", nights: 0, status: "PLANNED" },
      { name: "A", nights: 1, status: "PLANNED" },
      { name: "B", nights: 2, status: "PLANNED" },
      { name: "C", nights: 14, status: "PLANNED" },
    ];
    expect(validateItineraryHardConstraints(stops, [], WINDOW)).toEqual([]);
  });
});
