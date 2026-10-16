import { describe, expect, it } from "vitest";
import { ZONES, zonedWallClockToUtc } from "./timezones";
import { buildSchedule, type ScheduleStop } from "./schedule";
import { resolveLiveState, googleMapsUrl, nightStopIndices } from "./live";

const TRIP_START = zonedWallClockToUtc(2026, 8, 14, 18, 0, ZONES.SFO.id);
const TRIP_END = zonedWallClockToUtc(2026, 8, 31, 13, 0, ZONES.SFO.id);
const ZONE = ZONES.SFO.id;

/** First five nights of the seeded sample loop — hotels are stops. */
const STOPS: ScheduleStop[] = [
  { name: "San Francisco", nights: 0 },
  { name: "Gilroy Gateway Inn (sample)", nights: 1 },
  { name: "Central Coast Inn Paso Robles (sample)", nights: 1 },
  { name: "Sierra Foothills Lodge Visalia (sample)", nights: 1 },
  { name: "Harbor View Inn Whittier (sample)", nights: 1 },
  { name: "Desert Route Inn Barstow (sample)", nights: 1 },
];

const schedule = buildSchedule({
  tripStart: TRIP_START,
  tripEnd: TRIP_END,
  zone: ZONE,
  stops: STOPS,
  legs: [],
});

/** UTC-noon civil date, the anchoring the whole date layer uses. */
const noon = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d, 12));

/** An instant during the SFO afternoon of the given civil date. */
const sfoAfternoon = (y: number, m: number, d: number) =>
  zonedWallClockToUtc(y, m, d, 15, 0, ZONES.SFO.id);

describe("resolveLiveState — which night is tonight", () => {
  it("puts the first night at Gilroy on arrival day (14. 8.)", () => {
    const state = resolveLiveState(schedule, sfoAfternoon(2026, 8, 14), ZONE);
    expect(state.phase).toBe("during");
    expect(state.currentIndex).toBe(0);
    expect(state.nights[0].stopName).toBe("Gilroy Gateway Inn (sample)");
    expect(state.nights[0].phase).toBe("current");
  });

  it("marks earlier nights past and later nights future", () => {
    const state = resolveLiveState(schedule, sfoAfternoon(2026, 8, 17), ZONE);
    expect(state.currentIndex).toBe(3);
    expect(state.nights.map((n) => n.phase)).toEqual([
      "past",
      "past",
      "past",
      "current",
      "future",
    ]);
  });

  it("is 'before' the trip and counts the days until it starts", () => {
    const state = resolveLiveState(schedule, sfoAfternoon(2026, 8, 11), ZONE);
    expect(state.phase).toBe("before");
    expect(state.currentIndex).toBeNull();
    expect(state.daysUntilStart).toBe(3);
    expect(state.focusIndex).toBe(0);
  });

  it("is 'after' the trip once the last night has passed", () => {
    const state = resolveLiveState(schedule, sfoAfternoon(2026, 9, 2), ZONE);
    expect(state.phase).toBe("after");
    expect(state.currentIndex).toBeNull();
    expect(state.focusIndex).toBe(schedule.nights.length - 1);
    expect(state.nights.every((n) => n.phase === "past")).toBe(true);
  });

  it("rolls the day over on the trip's clock, not the viewer's", () => {
    const state = resolveLiveState(
      schedule,
      zonedWallClockToUtc(2026, 8, 18, 23, 0, ZONES.PRG.id),
      ZONE,
    );
    expect(state.nights[state.currentIndex!].stopName).toBe(
      "Desert Route Inn Barstow (sample)",
    );
  });
});

describe("nightStopIndices — which stop (and so which hotel) a night sleeps at", () => {
  it("maps each night to the stop it belongs to, in order", () => {
    expect(nightStopIndices(schedule)).toEqual([1, 2, 3, 4, 5]);
  });

  it("spans a multi-night stop across every night it covers", () => {
    const twoNights = buildSchedule({
      tripStart: TRIP_START,
      tripEnd: TRIP_END,
      zone: ZONE,
      stops: [
        { name: "San Francisco", nights: 0 },
        { name: "Yosemite Valley Lodge (sample)", nights: 2 },
      ],
      legs: [],
    });
    expect(nightStopIndices(twoNights)).toEqual([1, 1]);
    expect(twoNights.nights.map((n) => n.stopName)).toEqual([
      "Yosemite Valley Lodge (sample)",
      "Yosemite Valley Lodge (sample)",
    ]);
    expect(
      twoNights.nights.every(
        (n) => n.date.getTime() < noon(2026, 8, 16).getTime(),
      ),
    ).toBe(true);
  });
});

describe("googleMapsUrl", () => {
  it("searches by hotel name and address", () => {
    expect(
      googleMapsUrl({
        name: "Desert Route Inn Barstow (sample)",
        address: "Barstow, CA",
      }),
    ).toBe(
      "https://www.google.com/maps/search/?api=1&query=Desert%20Route%20Inn%20Barstow%20(sample)%2C%20Barstow%2C%20CA",
    );
  });

  it("falls back to the name alone when there is no address", () => {
    expect(googleMapsUrl({ name: "X" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=X",
    );
  });
});
