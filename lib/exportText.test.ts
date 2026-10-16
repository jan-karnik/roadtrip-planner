import { describe, expect, it } from "vitest";
import { ZONES, zonedWallClockToUtc } from "./timezones";
import { buildDayByDayExportLines } from "./exportText";

const TRIP_START = zonedWallClockToUtc(2026, 8, 12, 18, 0, ZONES.SFO.id);
const TRIP_END = zonedWallClockToUtc(2026, 8, 14, 13, 0, ZONES.SFO.id);

describe("buildDayByDayExportLines", () => {
  it("includes drive metrics and hotel address on arrival nights", () => {
    const lines = buildDayByDayExportLines({
      tripStart: TRIP_START,
      tripEnd: TRIP_END,
      zone: ZONES.SFO.id,
      stops: [
        { name: "SFO Airport", shortName: "SFO", nights: 0, status: "PLANNED" },
        {
          name: "Hotel Example",
          shortName: "Hotel",
          nights: 1,
          status: "PLANNED",
          isHotel: true,
          address: "123 Main St",
        },
      ],
      legs: [{ km: 50, hours: 1 }],
    });
    const joined = lines.join("\n");
    expect(joined).toContain("2026-08-12");
    expect(joined).toContain("SFO → Hotel");
    expect(joined).toContain("50 km");
    expect(joined).toContain("123 Main St");
  });
});
