import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { ZONES } from "@/lib/timezones";
import { loadLiveItinerary } from "@/lib/liveItinerary";
import {
  activeLegPoints,
  assembleLegs,
  pairsFrom,
} from "@/lib/legs";
import { resolveRoutes } from "@/lib/routing";
import { buildDetailedExportText } from "@/lib/exportText";
import { ExportActions } from "@/components/export/ExportActions";

// Plain-text, copy/paste-friendly rendering of the itinerary — for pasting
// into another tool (an AI chat, a doc, a message), not for editing. Reads
// the pinned live Variant by default, or a specific one via `?option=<id>`
// (same convention as `/` and `/live`). `force-dynamic`: same reason as
// those routes — it reflects whatever the live Variant currently is.
export const dynamic = "force-dynamic";

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ option?: string }>;
}) {
  const { option: optionId } = await searchParams;
  const trip = await db.trip.findFirst({ orderBy: { createdAt: "asc" } });

  if (!trip || !trip.startDate || !trip.endDate) {
    return (
      <p className="p-6 text-sm text-slate-400">
        {t.itinerary.noTrip}
        <code className="text-accent">npm run db:reset</code>
        {t.itinerary.noTripAfter}
      </p>
    );
  }

  const { stops, option } = await loadLiveItinerary(db, trip.id, optionId);
  const points = activeLegPoints(stops);
  const routes = await resolveRoutes(db, pairsFrom(points));
  const legs = assembleLegs(points, routes);

  const title = [
    trip.name,
    option?.label ? `— ${option.label}` : null,
    option ? `(var. #${option.seq})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const text = buildDetailedExportText({
    stops: stops.map((s) => ({
      name: s.name,
      shortName: s.shortName,
      nights: s.nights,
      status: s.status,
      isHotel: s.isHotel,
      address: s.address,
      phone: s.phone,
    })),
    tripStart: trip.startDate,
    tripEnd: trip.endDate,
    zone: ZONES.SFO.id,
    title,
    legs: legs.map((l) => ({ km: l.km, hours: l.hours })),
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          {t.exportPage.title}
        </h1>
        <p className="mt-1 text-sm text-slate-400">{t.exportPage.hint}</p>
      </header>
      <ExportActions text={text} />
    </div>
  );
}
