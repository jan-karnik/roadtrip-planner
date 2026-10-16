import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { loadLiveItinerary } from "@/lib/liveItinerary";
import { MapPlanner } from "@/components/map/MapPlanner";
import { MobileHome } from "@/components/home/MobileHome";
import { ViewportGate } from "@/components/layout/ViewportGate";

export const dynamic = "force-dynamic";

/** Below this the planner is replaced by the phone home screen (Tailwind `md`). */
const DESKTOP_QUERY = "(min-width: 768px)";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ option?: string; planner?: string }>;
}) {
  const { option: optionId, planner } = await searchParams;

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

  // When ?option=<id> is present, seed the draft from that saved option (a
  // frozen snapshot) and show the "viewing #X" banner. Without it, seed from the
  // pinned live Variant (LIVE_OPTION_SEQ — the seeded sample the /live view also
  // reads), falling back to the seeded master stops if it doesn't exist. The
  // seeded draft stays editable either way.
  const { stops: initialStops, option: seedOption } = await loadLiveItinerary(
    db,
    trip.id,
    optionId,
  );

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

  const tripStart = trip.startDate?.toISOString() ?? null;
  const tripEnd = trip.endDate?.toISOString() ?? null;

  const plannerView = (
    <MapPlanner
      tripId={trip.id}
      tripName={trip.name}
      initialStops={initialStops}
      tripStart={tripStart}
      tripEnd={tripEnd}
      availablePlaces={availablePlaces}
      viewingOption={
        seedOption
          ? { id: seedOption.id, seq: seedOption.seq, label: seedOption.label }
          : undefined
      }
    />
  );

  // A phone that asked for the planner (?planner=1) or for a specific Variant
  // (?option=…) gets it full-screen; a bare / on a phone gets the home screen
  // instead, whose whole job is a one-tap route into /live. The desktop planner
  // is mounted behind a viewport gate rather than hidden with CSS so the phone
  // never downloads mapbox-gl and its tiles just to keep it off-screen.
  if (planner === "1" || optionId) return plannerView;

  return (
    <>
      <div className="md:hidden">
        <MobileHome
          tripName={trip.name}
          tripStart={tripStart}
          tripEnd={tripEnd}
          optionLabel={seedOption?.label ?? null}
        />
      </div>
      <ViewportGate query={DESKTOP_QUERY}>{plannerView}</ViewportGate>
    </>
  );
}
