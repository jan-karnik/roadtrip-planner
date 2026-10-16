"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { resolveRoutes } from "@/lib/routing";
import type { RouteResult } from "@/lib/legs";
import type { LatLng } from "@/lib/types";

// Returns a real road route per from→to pair, in the same order as the input.
// Each result is cached in the `Leg` table (keyed by rounded coords) so draft
// reordering and repeat visits don't re-hit the Directions API. A `null` entry
// means routing was unavailable for that pair → the client draws a straight
// great-circle line + mock time as a fallback.

const pointSchema = z.object({ lat: z.number(), lng: z.number() });
const pairsSchema = z
  .array(z.object({ from: pointSchema, to: pointSchema }))
  .max(50);

export async function getRoutes(
  pairs: { from: LatLng; to: LatLng }[],
): Promise<RouteResult[]> {
  const parsed = pairsSchema.safeParse(pairs);
  if (!parsed.success) return pairs.map(() => null);

  return resolveRoutes(db, parsed.data);
}
