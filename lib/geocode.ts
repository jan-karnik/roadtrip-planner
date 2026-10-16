// Normalizes a raw place name into a canonical title + structured fields + coords
// using OpenStreetMap's Nominatim. This is the single source of truth for what a
// "normalized place title" means in the app.

export type GeocodeResult = {
  /** Canonical display title, e.g. "Yosemite National Park, California, United States". */
  name: string;
  /** Best short label (city / attraction name). */
  shortName: string;
  country: string | null;
  region: string | null;
  category: string;
  lat: number;
  lng: number;
  osmId: string;
};

type NominatimItem = {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  osm_type: string;
  osm_id: number;
  type?: string;
  class?: string;
  address?: Record<string, string>;
};

const ENDPOINT = "https://nominatim.openstreetmap.org/search";

function normalizeItem(item: NominatimItem): GeocodeResult {
  const addr = item.address ?? {};
  const country = addr.country ?? null;
  const region = addr.state ?? addr.region ?? addr.county ?? null;
  const shortName =
    item.name ||
    addr.attraction ||
    addr.tourism ||
    addr.city ||
    addr.town ||
    addr.village ||
    item.display_name.split(",")[0];
  return {
    name: item.display_name,
    shortName,
    country,
    region,
    category: item.type || item.class || "poi",
    lat: Number(item.lat),
    lng: Number(item.lon),
    osmId: `${item.osm_type}/${item.osm_id}`,
  };
}

/**
 * Search Nominatim for up to `limit` candidates matching `query`.
 * Results are biased toward the US west coast (CA/NV/UT/AZ) but not bounded.
 * Throws on network/HTTP failure.
 */
export async function searchPlaces(
  query: string,
  limit = 5
): Promise<GeocodeResult[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "us");
  // Soft viewbox bias toward CA/NV/UT/AZ — bounded=0 means results outside are
  // still returned if nothing better is found inside.
  url.searchParams.set("viewbox", "-124.5,32.5,-109.0,42.5");
  url.searchParams.set("bounded", "0");

  const res = await fetch(url, {
    headers: {
      "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "roadtrip-planner/0.1",
      "Accept-Language": "en",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Nominatim request failed: ${res.status}`);

  const items = (await res.json()) as NominatimItem[];
  return items.map(normalizeItem);
}

/**
 * Geocode a free-text place query. Returns the top match normalized, or null if
 * nothing was found. Throws on network/HTTP failure so callers can surface it.
 */
export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  const results = await searchPlaces(query, 1);
  return results[0] ?? null;
}
