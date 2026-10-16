import { PrismaClient } from "@prisma/client";
import { ZONES, zonedWallClockToUtc } from "../lib/timezones";
import { SAMPLE_LIVE_STOPS, SAMPLE_TRIP } from "./sampleLiveVariant";

const db = new PrismaClient();

// Minimal legacy fallback stops (used only when no saved Variant exists).
const LEGACY_PLACES = [
  {
    rawName: "San Francisco",
    name: "San Francisco, California, United States",
    shortName: "San Francisco",
    region: "California",
    country: "United States",
    category: "city",
    lat: 37.7749,
    lng: -122.4194,
    status: "PLANNED",
    nights: 0,
  },
  {
    rawName: "Yosemite",
    name: "Yosemite National Park, California, United States",
    shortName: "Yosemite National Park",
    region: "California",
    country: "United States",
    category: "national_park",
    lat: 37.8651,
    lng: -119.5383,
    status: "PLANNED",
    nights: 2,
  },
];

async function main() {
  await db.optionStop.deleteMany();
  await db.itineraryOption.deleteMany();
  await db.itineraryStop.deleteMany();
  await db.place.deleteMany();
  await db.trip.deleteMany();

  const trip = await db.trip.create({
    data: {
      name: SAMPLE_TRIP.name,
      slug: SAMPLE_TRIP.slug,
      description: SAMPLE_TRIP.description,
      startDate: zonedWallClockToUtc(
        SAMPLE_TRIP.start.y,
        SAMPLE_TRIP.start.m,
        SAMPLE_TRIP.start.d,
        SAMPLE_TRIP.start.h,
        0,
        ZONES.SFO.id,
      ),
      endDate: zonedWallClockToUtc(
        SAMPLE_TRIP.end.y,
        SAMPLE_TRIP.end.m,
        SAMPLE_TRIP.end.d,
        SAMPLE_TRIP.end.h,
        0,
        ZONES.SFO.id,
      ),
    },
  });

  let order = 0;
  for (const p of LEGACY_PLACES) {
    const place = await db.place.create({
      data: {
        rawName: p.rawName,
        name: p.name,
        shortName: p.shortName,
        region: p.region,
        country: p.country,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
      },
    });

    await db.itineraryStop.create({
      data: {
        tripId: trip.id,
        placeId: place.id,
        order: order++,
        dayIndex: order === 1 ? 1 : null,
        nights: p.nights,
        status: p.status,
      },
    });
  }

  const liveOption = await db.itineraryOption.create({
    data: {
      tripId: trip.id,
      seq: 1,
      label: "Sample west-coast loop",
      totalDistanceM: 0,
      totalDurationS: 0,
      stops: {
        create: SAMPLE_LIVE_STOPS.map((s, i) => ({
          order: i,
          name: s.name,
          shortName: s.shortName,
          lat: s.lat,
          lng: s.lng,
          nights: s.nights,
          bookedNights: s.isHotel ? s.nights : 0,
          status: s.status,
          isHotel: s.isHotel ?? false,
          address: s.address ?? null,
          url: s.url ?? null,
          phone: null,
        })),
      },
    },
  });

  console.log(
    `Seeded trip "${trip.name}" with legacy ${LEGACY_PLACES.length} stops ` +
      `and live Variant #${liveOption.seq} (${SAMPLE_LIVE_STOPS.length} stops).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
