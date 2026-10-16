"use server";

import { z } from "zod";
import { fetchDirections } from "@/lib/routing";
import { ROUTE_TIME_CORRECTION } from "@/lib/legs";
import type { LatLng } from "@/lib/types";

// Routing from the phone's *current* GPS position to the next destination, for
// the on-the-go view (/live).
//
// Deliberately NOT `getRoutes`: that caches every leg in the `Leg` table keyed by
// rounded coordinates, which is right for itinerary legs (the same pair recurs
// constantly) and wrong here — a moving car produces a new coordinate every time,
// so caching would fill the table with rows that are never read again. This call
// is uncached, and the client rate-limits how often it fires.

const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type LiveRoute = { distanceKm: number; hours: number } | null;

export async function getLiveRoute(
  from: LatLng,
  to: LatLng,
): Promise<LiveRoute> {
  const parsed = z.object({ from: pointSchema, to: pointSchema }).safeParse({
    from,
    to,
  });
  if (!parsed.success) return null;

  const route = await fetchDirections(parsed.data.from, parsed.data.to);
  if (!route) return null;

  // Only the numbers — the geometry would be a large payload the view never draws.
  // Same Mapbox-vs-Google calibration as assembleLegs (see ROUTE_TIME_CORRECTION).
  return {
    distanceKm: route.distanceM / 1000,
    hours: (route.durationS / 3600) * ROUTE_TIME_CORRECTION,
  };
}
