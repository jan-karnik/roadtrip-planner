// Mapbox Directions, with no runtime boundary of its own.
//
// `lib/routing.ts` re-exports this behind `import "server-only"` for app code.
// Offline scripts (tsx) can't import that guard, so they import THIS module
// directly instead of hand-copying the Directions call — which is what
// scripts/generate-itinerary.ts used to do.
//
// The secret token (`sk.`) is read from the environment at call time, so it is
// still never bundled for the browser: nothing in `app/` or `components/` may
// import this file directly.

import type { LatLng } from "./types";
import type { RouteResult } from "./legs";

const BASE = "https://api.mapbox.com/directions/v5/mapbox/driving";

/** Round coords so tiny float jitter still hits the same cache row. */
export function legCacheKey(from: LatLng, to: LatLng): string {
  const r = (n: number) => n.toFixed(5);
  return `${r(from.lng)},${r(from.lat)};${r(to.lng)},${r(to.lat)}`;
}

/**
 * A real road route for one from→to leg, or null on any failure (caller falls
 * back to a straight great-circle line + mock time).
 */
export async function fetchDirections(
  from: LatLng,
  to: LatLng,
): Promise<RouteResult> {
  // Read at call time, not module load: scripts load .env themselves, after
  // this module may already have been imported.
  const token = process.env.MAPBOX_API_KEY ?? "";
  if (!token) return null;

  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url =
    `${BASE}/${coords}` +
    `?alternatives=false&geometries=geojson&overview=full` +
    `&access_token=${token}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      code?: string;
      routes?: {
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
      }[];
    };
    const route = json.routes?.[0];
    if (json.code !== "Ok" || !route) return null;

    return {
      distanceM: route.distance,
      durationS: route.duration,
      geometry: route.geometry.coordinates,
    };
  } catch {
    return null;
  }
}

/** The subset of PrismaClient this module needs — keeps scripts and the app
 *  interchangeable without importing the full client type here. */
type LegCache = {
  leg: {
    findUnique(args: {
      where: { cacheKey: string };
    }): Promise<{
      distanceM: number;
      durationS: number;
      geometry: string;
    } | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
};

/**
 * Resolve each from→to pair from the `Leg` cache, falling back to a live
 * Directions call (whose result is then cached). Order matches the input; a
 * `null` entry means routing was unavailable for that pair.
 */
export async function resolveRoutes(
  db: LegCache,
  pairs: { from: LatLng; to: LatLng }[],
): Promise<RouteResult[]> {
  return Promise.all(pairs.map((p) => resolveLeg(db, p.from, p.to)));
}

async function resolveLeg(
  db: LegCache,
  from: LatLng,
  to: LatLng,
): Promise<RouteResult> {
  const cacheKey = legCacheKey(from, to);

  const cached = await db.leg.findUnique({ where: { cacheKey } });
  if (cached) {
    return {
      distanceM: cached.distanceM,
      durationS: cached.durationS,
      geometry: JSON.parse(cached.geometry) as [number, number][],
    };
  }

  const route = await fetchDirections(from, to);
  if (!route) return null;

  // Concurrent identical legs can race on the unique key; swallow the conflict
  // and return the freshly-fetched route regardless.
  try {
    await db.leg.create({
      data: {
        cacheKey,
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: to.lat,
        toLng: to.lng,
        distanceM: route.distanceM,
        durationS: route.durationS,
        geometry: JSON.stringify(route.geometry),
      },
    });
  } catch {
    // unique-key race — fine, the value is already (being) cached
  }

  return route;
}
