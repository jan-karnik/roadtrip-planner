import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { loadLiveItinerary } from "@/lib/liveItinerary";
import { OnTheGoView } from "@/components/live/OnTheGoView";

// "Na cestě" — the on-the-go view. Reads the pinned live Variant (not an
// editable draft: during the trip the plan is a fact, not a sandbox) and lets the
// client resolve "tonight" from the device clock. Hotels come along on the stops
// themselves (`isHotel`), so there is no second query for accommodation.
// `force-dynamic` because what it shows changes with the date.
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const trip = await db.trip.findFirst({ orderBy: { createdAt: "asc" } });

  if (!trip) {
    return (
      <p className="p-6 text-sm text-slate-400">
        {t.itinerary.noTrip}
        <code className="text-accent">npm run db:reset</code>
        {t.itinerary.noTripAfter}
      </p>
    );
  }

  const { stops, option } = await loadLiveItinerary(db, trip.id);

  return (
    <OnTheGoView
      stops={stops}
      tripStart={trip.startDate?.toISOString() ?? null}
      tripEnd={trip.endDate?.toISOString() ?? null}
      optionLabel={option?.label ?? null}
    />
  );
}
