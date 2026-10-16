import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { MapPlanner } from "@/components/map/MapPlanner";

export const dynamic = "force-dynamic";

/**
 * Create-itinerary flow: an empty map planner where a route is assembled from
 * scratch — picking existing project POIs or searching real places — with live
 * distance/time, then named and saved as a new Variant (via SaveOptionForm).
 */
export default async function CreatePage() {
  const trip = await db.trip.findFirst({ orderBy: { createdAt: "asc" } });

  if (!trip) {
    return (
      <p className="text-sm text-slate-400">
        {t.itinerary.noTrip}
        <code className="text-accent">npm run db:reset</code>
        {t.itinerary.noTripAfter}
      </p>
    );
  }

  const availablePlaces = (
    await db.place.findMany({ orderBy: { name: "asc" } })
  ).map((p) => ({
    name: p.name,
    shortName: p.shortName,
    region: p.region,
    lat: p.lat,
    lng: p.lng,
    osmId: p.osmId,
  }));

  return (
    <MapPlanner
      tripId={trip.id}
      tripName={trip.name}
      initialStops={[]}
      tripStart={trip.startDate?.toISOString() ?? null}
      tripEnd={trip.endDate?.toISOString() ?? null}
      availablePlaces={availablePlaces}
    />
  );
}
