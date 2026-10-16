import type { PrismaClient } from "@prisma/client";
import { isStopStatus, type StopStatus } from "./types";

// Which saved Variant the app treats as "the itinerary we are actually doing".
//
// `/` seeds its editable draft from it, and `/live` (the on-the-go view) reads
// it as the live plan. Re-pointing the trip at a different Variant is a one-line
// change here — that's why the lookup lives in one place instead of being
// duplicated across routes.
export const LIVE_OPTION_SEQ = 1;

/** A stop of the live itinerary — same shape as the map's `SnapshotStop`. */
export type LiveStop = {
  id: string;
  name: string;
  shortName: string | null;
  lat: number;
  lng: number;
  nights: number;
  bookedNights: number;
  status: StopStatus;
  /** True when this stop IS the booked accommodation for its nights. */
  isHotel: boolean;
  address: string | null;
  url: string | null;
  phone: string | null;
};

export type LiveItinerary = {
  stops: LiveStop[];
  /** The Variant the stops came from, or null when falling back to the seed stops. */
  option: { id: string; seq: number; label: string | null } | null;
};

function toStatus(raw: string): StopStatus {
  return (isStopStatus(raw) ? raw : "PLANNED") as StopStatus;
}

/**
 * Load the itinerary for a trip: the pinned live Variant (`LIVE_OPTION_SEQ`),
 * or a specific one when `optionId` is given. Falls back to the master seed
 * stops if the Variant doesn't exist, so the app still renders on a fresh DB.
 */
export async function loadLiveItinerary(
  client: PrismaClient,
  tripId: string,
  optionId?: string,
): Promise<LiveItinerary> {
  const option = await client.itineraryOption.findFirst({
    where: optionId
      ? { id: optionId, tripId }
      : { tripId, seq: LIVE_OPTION_SEQ },
    include: { stops: { orderBy: { order: "asc" } } },
  });

  if (option) {
    return {
      option: { id: option.id, seq: option.seq, label: option.label },
      stops: option.stops.map((s) => ({
        id: s.id,
        name: s.name,
        shortName: s.shortName,
        lat: s.lat,
        lng: s.lng,
        nights: s.nights,
        bookedNights: s.bookedNights,
        status: toStatus(s.status),
        isHotel: s.isHotel,
        address: s.address,
        url: s.url,
        phone: s.phone,
      })),
    };
  }

  const stops = await client.itineraryStop.findMany({
    where: { tripId },
    orderBy: { order: "asc" },
    include: { place: true },
  });

  return {
    option: null,
    stops: stops.map((s) => ({
      id: s.id,
      name: s.place.name,
      shortName: s.place.shortName,
      lat: s.place.lat,
      lng: s.place.lng,
      nights: s.nights ?? 0,
      bookedNights: 0,
      status: toStatus(s.status),
      // The seed fallback has no accommodation data — hotels only exist on
      // saved Variants (OptionStop).
      isHotel: false,
      address: null,
      url: null,
      phone: null,
    })),
  };
}
