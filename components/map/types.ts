import type { StopStatus } from "@/lib/types";

/**
 * A stop in the map view's DRAFT snapshot. Seeded from the live itinerary but
 * edited only in client state — it never writes back to the DB / master list.
 * Carries coordinates (unlike the list's StopView) so the map can plot it.
 */
export type SnapshotStop = {
  id: string;
  name: string;
  shortName: string | null;
  lat: number;
  lng: number;
  /** Nights slept at this stop — drives the day-by-day schedule / fit check. */
  nights: number;
  /** How many of those nights are already booked/paid — enforces a lower bound on the nights counter. */
  bookedNights: number;
  status: StopStatus;
  /** True when this stop IS the booked accommodation for its nights. */
  isHotel: boolean;
  address: string | null;
  url: string | null;
  phone: string | null;
};

/**
 * A POI already known to the project (a `Place` row), offered in the add-stop
 * picker so a draft can be assembled from existing places without re-geocoding.
 */
export type PickablePlace = {
  name: string;
  shortName: string | null;
  region: string | null;
  lat: number;
  lng: number;
  osmId: string | null;
};
