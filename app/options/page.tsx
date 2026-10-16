import Link from "next/link";
import { db } from "@/lib/db";
import { isStopStatus, type StopStatus } from "@/lib/types";
import { ZONES, nightsBetween } from "@/lib/timezones";
import { t } from "@/lib/i18n";
import { OptionsRanking } from "@/components/options/OptionsRanking";
import type { OptionView } from "@/components/options/types";

export const dynamic = "force-dynamic";

export default async function OptionsPage() {
  const trip = await db.trip.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      options: {
        orderBy: { seq: "asc" },
        include: { stops: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!trip) {
    return (
      <p className="text-sm text-slate-400">
        {t.itinerary.noTrip}
        <code className="text-accent">npm run db:reset</code>
        {t.itinerary.noTripAfter}
      </p>
    );
  }

  const tripNights =
    trip.startDate && trip.endDate
      ? nightsBetween(trip.startDate, trip.endDate, ZONES.SFO.id)
      : null;

  const options: OptionView[] = trip.options.map((o) => ({
    id: o.id,
    seq: o.seq,
    label: o.label,
    totalKm: o.totalDistanceM / 1000,
    totalHours: o.totalDurationS / 3600,
    totalNights: o.stops
      .filter((s) => s.status !== "SKIPPED")
      .reduce((a, s) => a + s.nights, 0),
    stops: o.stops.map((s) => ({
      name: s.name,
      shortName: s.shortName,
      lat: s.lat,
      lng: s.lng,
      nights: s.nights,
      status: (isStopStatus(s.status) ? s.status : "PLANNED") as StopStatus,
    })),
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.options.heading}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{t.options.subtitle}</p>
        </div>
        {options.length >= 2 && (
          <Link
            href="/options/compare"
            className="text-sm font-medium text-accent hover:underline"
          >
            {t.options.compareLink}
          </Link>
        )}
      </div>

      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-base-600 bg-base-800/50 px-4 py-8 text-center text-sm text-slate-500">
          {t.options.empty}{" "}
          <Link href="/" className="text-accent hover:underline">
            {t.nav.map}
          </Link>
        </p>
      ) : (
        <OptionsRanking options={options} tripNights={tripNights} />
      )}
    </div>
    </div>
  );
}
