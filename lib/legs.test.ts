import { describe, expect, it } from "vitest";
import {
  assembleLegs,
  legColor,
  nightSegments,
  withSegmentExertion,
  ROUTE_TIME_CORRECTION,
  type LegPoint,
  type RouteResult,
} from "./legs";

/** Points on a straight-ish line; distances don't matter, routes are supplied. */
function points(n: number): LegPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    name: `P${i}`,
    lat: 37 + i,
    lng: -122,
  }));
}

function route(hours: number, km = hours * 90): RouteResult {
  return {
    distanceM: km * 1000,
    durationS: hours * 3600,
    geometry: [
      [0, 0],
      [1, 1],
    ],
  };
}

describe("nightSegments", () => {
  it("groups the legs between overnight stops", () => {
    // P0 (start) → P1 (pass-through) → P2 (sleep) → P3 (sleep)
    const legs = assembleLegs(points(4), [route(2), route(3), route(1)]);
    const segments = nightSegments(legs, [0, 0, 1, 1]);

    expect(segments.map((s) => s.legIndices)).toEqual([[0, 1], [2]]);
    expect(segments[0].hours).toBeCloseTo(5 * ROUTE_TIME_CORRECTION);
    expect(segments[0].km).toBeCloseTo(450);
  });

  it("emits a trailing segment that never reaches an overnight stop", () => {
    const legs = assembleLegs(points(3), [route(2), route(2)]);
    expect(nightSegments(legs, [1, 0, 0]).map((s) => s.legIndices)).toEqual([
      [0, 1],
    ]);
  });

  it("treats every leg as its own segment when we sleep at each stop", () => {
    const legs = assembleLegs(points(3), [route(2), route(4)]);
    expect(nightSegments(legs, [1, 1, 1]).map((s) => s.legIndices)).toEqual([
      [0],
      [1],
    ]);
  });
});

describe("withSegmentExertion", () => {
  it("colours both hops of one travel day by their combined driving time", () => {
    const legs = withSegmentExertion(
      assembleLegs(points(3), [route(3), route(3)]),
      [0, 0, 1],
    );

    for (const leg of legs) {
      expect(leg.segmentHours).toBeCloseTo(6 * ROUTE_TIME_CORRECTION);
      expect(leg.segmentKm).toBeCloseTo(540);
      expect(leg.segmentLegCount).toBe(2);
      expect(leg.color).toBe(legColor(6 * ROUTE_TIME_CORRECTION));
    }
    // Per-leg metrics are untouched — only the grading changed.
    expect(legs[0].hours).toBeCloseTo(3 * ROUTE_TIME_CORRECTION);
    expect(legs[0].color).not.toBe(legColor(3 * ROUTE_TIME_CORRECTION));
  });

  it("leaves a standalone overnight→overnight leg graded by itself", () => {
    const legs = withSegmentExertion(
      assembleLegs(points(2), [route(4)]),
      [1, 1],
    );
    expect(legs[0].segmentLegCount).toBe(1);
    expect(legs[0].color).toBe(legColor(4 * ROUTE_TIME_CORRECTION));
  });
});
