// Per-leg model for the map. A "leg" is the travel segment between two
// consecutive active (non-skipped) stops. Distance/duration/geometry come from
// real Mapbox Directions routing (see lib/routing.ts + app/actions/routes.ts);
// when routing is unavailable we fall back to a straight great-circle line with
// a mock time. Colour grades green→red by how exhausting the DRIVE is (by
// duration), so a long haul reads as "hot" at a glance. The map grades by the
// whole overnight→overnight segment (see `withSegmentExertion`): pass-through
// stops don't split a travel day into deceptively "easy" pieces.

import { haversineKm } from "./distance";
import type { LatLng } from "./types";

/** Mock average ground speed (km/h) — only used for the straight-line fallback. */
export const AVG_KMH = 90;

/**
 * Calibration factor applied to real Mapbox Directions durations. Mapbox's
 * plain `driving` profile (see `lib/routing.core.ts`) uses conservative
 * typical-speed estimates and consistently runs slower than Google Maps for
 * the same road pair — verified against 5 real legs with
 * independently-known Google Maps times (Yosemite→SF, Bakersfield→Santa
 * Clarita, Hoover Dam→Las Vegas, Las Vegas→Alabama Hills, Peach Springs→Grand
 * Canyon Village): Mapbox ran ~15% long on average (ratios 1.04–1.25).
 * Two other legs (Cedar City→Zion, Zion→Valley of Fire) were off by much
 * more (1.35–1.83x) — those look like Mapbox choosing a different, longer
 * road (route distance itself was ~20% longer, not just slower), most likely
 * because the "Zion National Park" pin sits inside the park rather than at a
 * road junction. That's a per-stop pin issue, not something a blanket time
 * factor can fix — re-pin those stops rather than pushing this constant lower.
 * Only applied to real routing results, not the straight-line/mock fallback.
 */
export const ROUTE_TIME_CORRECTION = 0.87;

/** Driving time (hours) at/above which a leg is considered maximally exhausting. */
export const EXERTION_MAX_HOURS = 8;

/** Duration thresholds (hours) for the discrete exertion label. */
export const EXERTION_EASY_MAX_HOURS = 3;
export const EXERTION_MODERATE_MAX_HOURS = 6;

export type ExertionLevel = "easy" | "moderate" | "hard";

export type LegPoint = {
  id: string;
  name: string;
  shortName?: string | null;
  lat: number;
  lng: number;
};

/** Real road route for one leg, or null when routing was unavailable. */
export type RouteResult = {
  distanceM: number;
  durationS: number;
  /** Polyline following roads, as [lng, lat] pairs. */
  geometry: [number, number][];
} | null;

export type Leg = {
  index: number;
  from: LegPoint;
  to: LegPoint;
  /** Driving distance, km (real road distance, or haversine when fallback). */
  km: number;
  /** Driving time, hours (real, or mock when fallback). */
  hours: number;
  /** Normalised exhaustion 0..1 (segmentHours / EXERTION_MAX_HOURS, clamped). */
  exertion: number;
  /** Colour graded by exertion, as an `hsl(...)` string. */
  color: string;
  /** Driving distance of the whole overnight→overnight segment this leg is part
   *  of, km. Equals `km` until `withSegmentExertion` groups the legs. */
  segmentKm: number;
  /** Driving time of the whole overnight→overnight segment, hours. */
  segmentHours: number;
  /** How many legs the segment spans (1 = the leg is a whole travel day). */
  segmentLegCount: number;
  /** Geometry to draw, as [lng, lat] pairs (road polyline or straight line). */
  geometry: [number, number][];
  /** True when this is the straight-line/mock fallback (no real route). */
  fallback: boolean;
};

/** Minimal stop shape that can be reduced to active leg points. */
export type StopLike = {
  id?: string;
  name: string;
  shortName?: string | null;
  lat: number;
  lng: number;
  status: string;
};

/**
 * The ordered, non-SKIPPED stops as `LegPoint`s — the route the map actually
 * draws and that totals are computed over. Shared by the map planner and the
 * options action so both agree on what "active" means.
 */
export function activeLegPoints(stops: StopLike[]): LegPoint[] {
  return stops
    .filter((s) => s.status !== "SKIPPED")
    .map((s, i) => ({
      id: s.id ?? String(i),
      name: s.name,
      shortName: s.shortName ?? null,
      lat: s.lat,
      lng: s.lng,
    }));
}

/** Consecutive from→to coordinate pairs over an ordered list of points. */
export function pairsFrom(points: LatLng[]): { from: LatLng; to: LatLng }[] {
  const pairs: { from: LatLng; to: LatLng }[] = [];
  for (let i = 1; i < points.length; i++) {
    pairs.push({
      from: { lat: points[i - 1].lat, lng: points[i - 1].lng },
      to: { lat: points[i].lat, lng: points[i].lng },
    });
  }
  return pairs;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Mock travel time for a distance, in hours (straight-line fallback only). */
export function mockHours(km: number): number {
  return km / AVG_KMH;
}

/** Normalised 0..1 exhaustion for a leg of the given driving time. */
export function exertion(hours: number): number {
  return clamp01(hours / EXERTION_MAX_HOURS);
}

/** Discrete exertion bucket, for the text label/legend. */
export function exertionLevel(hours: number): ExertionLevel {
  if (hours <= EXERTION_EASY_MAX_HOURS) return "easy";
  if (hours <= EXERTION_MODERATE_MAX_HOURS) return "moderate";
  return "hard";
}

/**
 * Colour for a leg of the given driving time: a continuous green→amber→red ramp.
 * Hue runs from ~140° (green, restful) to 0° (red, exhausting); S/L are fixed
 * for legibility on the dark basemap. Returned as `hsl(...)` so the same string
 * works for both Mapbox `line-color` and React inline styles.
 */
export function legColor(hours: number): string {
  const hue = Math.round(140 * (1 - exertion(hours))); // 140 → 0
  return `hsl(${hue}, 90%, 68%)`; // bright enough to read on a dark panel bg
}

/**
 * Build the ordered legs between consecutive points, enriched with real routing
 * results where available. `routes[i]` corresponds to the leg from points[i] to
 * points[i+1]; a null (or missing) entry yields a straight-line fallback.
 * Fewer than two points yields no legs.
 */
export function assembleLegs(
  points: LegPoint[],
  routes: RouteResult[] = [],
): Leg[] {
  const legs: Leg[] = [];
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const route = routes[i - 1] ?? null;

    let km: number;
    let hours: number;
    let geometry: [number, number][];
    let fallback: boolean;

    if (route) {
      km = route.distanceM / 1000;
      hours = (route.durationS / 3600) * ROUTE_TIME_CORRECTION;
      geometry = route.geometry;
      fallback = false;
    } else {
      km = haversineKm(from, to);
      hours = mockHours(km);
      geometry = [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ];
      fallback = true;
    }

    legs.push({
      index: i - 1,
      from,
      to,
      km,
      hours,
      exertion: exertion(hours),
      color: legColor(hours),
      segmentKm: km,
      segmentHours: hours,
      segmentLegCount: 1,
      geometry,
      fallback,
    });
  }
  return legs;
}

/** One travel segment between two consecutive overnight stops. */
export type NightSegment = {
  /** Indices into the leg array that make up this segment, in order. */
  legIndices: number[];
  km: number;
  hours: number;
};

/**
 * Split the legs into segments delimited by **overnight** stops, i.e. how the
 * trip is actually driven: everything between two nights is one travel day, no
 * matter how many pass-through stops sit in between.
 *
 * `nights[i]` is the number of nights slept at active point `i` (the same order
 * `activeLegPoints` produces). A segment ends at the first following point with
 * `nights > 0`; the trailing segment (no closing overnight) is emitted as-is.
 */
export function nightSegments(legs: Leg[], nights: number[]): NightSegment[] {
  const segments: NightSegment[] = [];
  let current: NightSegment | null = null;
  for (const leg of legs) {
    if (!current) current = { legIndices: [], km: 0, hours: 0 };
    current.legIndices.push(leg.index);
    current.km += leg.km;
    current.hours += leg.hours;
    // leg.index i runs from point i to point i+1: close the segment when we
    // arrive somewhere we sleep.
    if ((nights[leg.index + 1] ?? 0) > 0) {
      segments.push(current);
      current = null;
    }
  }
  if (current) segments.push(current);
  return segments;
}

/**
 * Re-grade the legs' exhaustion colour by the **whole overnight→overnight
 * segment** rather than the individual leg, so a travel day broken up by
 * pass-through stops reads as one continuous effort. Per-leg `km`/`hours` are
 * left untouched; only `exertion`/`color` and the `segment*` fields change.
 */
export function withSegmentExertion(legs: Leg[], nights: number[]): Leg[] {
  const out = legs.slice();
  for (const seg of nightSegments(legs, nights)) {
    const e = exertion(seg.hours);
    const color = legColor(seg.hours);
    for (const i of seg.legIndices) {
      out[i] = {
        ...out[i],
        exertion: e,
        color,
        segmentKm: seg.km,
        segmentHours: seg.hours,
        segmentLegCount: seg.legIndices.length,
      };
    }
  }
  return out;
}

/**
 * Interpolate a point along a sequence of legs (a travel day's
 * `legIndices`, in order) by distance fraction — used to place a "where we
 * are" marker on the map from the time of day alone, when GPS isn't
 * available. `fraction` is clamped to [0, 1]; 0 is the start of the first
 * leg's geometry, 1 the end of the last.
 */
export function pointAlongLegs(
  legs: Leg[],
  legIndices: number[],
  fraction: number,
): { lat: number; lng: number } | null {
  const points: [number, number][] = [];
  for (const i of legIndices) {
    const geometry = legs[i]?.geometry;
    if (!geometry || geometry.length === 0) continue;
    if (points.length > 0) points.pop(); // avoid duplicating the shared join point
    points.push(...geometry);
  }
  if (points.length === 0) return null;
  if (points.length === 1) return { lng: points[0][0], lat: points[0][1] };

  const f = Math.min(1, Math.max(0, fraction));
  const segLengths = points.slice(1).map((p, i) => {
    const [lng1, lat1] = points[i];
    const [lng2, lat2] = p;
    return haversineKm({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
  });
  const total = segLengths.reduce((a, b) => a + b, 0);
  if (total === 0) return { lng: points[0][0], lat: points[0][1] };

  let target = f * total;
  for (let i = 0; i < segLengths.length; i++) {
    const len = segLengths[i];
    if (target <= len || i === segLengths.length - 1) {
      const t = len === 0 ? 0 : target / len;
      const [lng1, lat1] = points[i];
      const [lng2, lat2] = points[i + 1];
      return { lng: lng1 + (lng2 - lng1) * t, lat: lat1 + (lat2 - lat1) * t };
    }
    target -= len;
  }
  const [lng, lat] = points[points.length - 1];
  return { lng, lat };
}
