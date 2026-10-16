"use server";

import { z } from "zod";
import { searchPlaces as geocodeSearch, type GeocodeResult } from "@/lib/geocode";
import { t } from "@/lib/i18n";

export type SearchResult =
  | { ok: true; candidates: GeocodeResult[] }
  | { ok: false; error: string };

const searchSchema = z.object({
  query: z.string().trim().min(2, t.errors.minChars),
});

/**
 * Return up to 5 Nominatim candidates for a query without committing anything.
 * The map's AddStopForm uses this to let the user pick a place into the draft;
 * nothing is written to the DB until the draft is saved as an ItineraryOption.
 */
export async function searchPlaces(input: { query: string }): Promise<SearchResult> {
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };

  let candidates: GeocodeResult[];
  try {
    candidates = await geocodeSearch(parsed.data.query, 5);
  } catch {
    return { ok: false, error: t.errors.searchUnavailable };
  }
  return { ok: true, candidates };
}
