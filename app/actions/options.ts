"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getRoutes } from "@/app/actions/routes";
import { assembleLegs, activeLegPoints, pairsFrom } from "@/lib/legs";
import { STOP_STATUSES } from "@/lib/types";
import { t } from "@/lib/i18n";
import {
  activeConstraintStops,
  checkBookedNights,
  validateItineraryHardConstraints,
} from "@/lib/itineraryConstraints";
import { constraintViolationMessage } from "@/lib/constraintMessages";
import { ZONES } from "@/lib/timezones";

const OPTIONS_PATH = "/options";

function constraintError(
  trip: { startDate: Date | null; endDate: Date | null },
  stops: SaveOptionStop[],
  legs: { km: number; hours: number }[],
): string | null {
  if (!trip.startDate || !trip.endDate) return null;
  const legMetrics = legs.map((l) => ({ km: l.km, hours: l.hours }));
  const bookedViolations = checkBookedNights(stops);
  if (bookedViolations.length > 0) {
    return constraintViolationMessage(bookedViolations[0]);
  }
  const active = activeConstraintStops(stops);
  const violations = validateItineraryHardConstraints(
    active,
    legMetrics,
    { start: trip.startDate, end: trip.endDate, zone: ZONES.SFO.id },
  );
  if (violations.length === 0) return null;
  return constraintViolationMessage(violations[0]);
}

export type SaveOptionResult =
  | { ok: true; seq: number }
  | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

const stopSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  nights: z.number().int().min(0).max(60).default(0),
  bookedNights: z.number().int().min(0).max(60).default(0),
  status: z.enum(STOP_STATUSES),
  // Accommodation carried ON the stop. These must round-trip through every
  // save: `updateOption` deletes and recreates the stops, so a field missing
  // from the payload is destroyed rather than preserved.
  isHotel: z.boolean().default(false),
  address: z.string().trim().max(200).nullable().default(null),
  url: z.string().trim().max(500).nullable().default(null),
  phone: z.string().trim().max(40).nullable().default(null),
});

const saveSchema = z.object({
  tripId: z.string().min(1),
  label: z.string().trim().max(80).optional(),
  stops: z.array(stopSchema).min(2, t.errors.tooFewStops).max(50),
});

export type SaveOptionStop = z.infer<typeof stopSchema>;

/**
 * Persist the map draft as a new ItineraryOption (a frozen snapshot). Totals are
 * recomputed server-side from real routing (Leg-cached) rather than trusting the
 * client, then stored on the row so the ranking view never re-fetches routes.
 */
export async function saveOption(input: {
  tripId: string;
  label?: string;
  stops: SaveOptionStop[];
}): Promise<SaveOptionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const { tripId, label, stops } = parsed.data;

  const trip = await db.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false, error: t.errors.tripNotFound };

  // Recompute totals over the active (non-skipped) route via real routing.
  const points = activeLegPoints(stops);
  const pairs = pairsFrom(points);
  const routes = pairs.length > 0 ? await getRoutes(pairs) : [];
  const legs = assembleLegs(points, routes);
  const blocked = constraintError(trip, stops, legs);
  if (blocked) return { ok: false, error: blocked };

  const totalDistanceM = legs.reduce((a, l) => a + l.km * 1000, 0);
  const totalDurationS = legs.reduce((a, l) => a + l.hours * 3600, 0);

  const last = await db.itineraryOption.findFirst({
    where: { tripId },
    orderBy: { seq: "desc" },
  });
  const seq = (last?.seq ?? 0) + 1;

  await db.itineraryOption.create({
    data: {
      tripId,
      seq,
      label: label && label.length > 0 ? label : null,
      totalDistanceM,
      totalDurationS,
      stops: {
        create: stops.map((s, i) => ({
          order: i,
          name: s.name,
          shortName: s.shortName,
          lat: s.lat,
          lng: s.lng,
          nights: s.nights,
          bookedNights: s.bookedNights,
          status: s.status,
          isHotel: s.isHotel,
          address: s.address,
          url: s.url,
          phone: s.phone,
        })),
      },
    },
  });

  revalidatePath(OPTIONS_PATH);
  return { ok: true, seq };
}

const updateSchema = z.object({
  optionId: z.string().min(1),
  label: z.string().trim().max(80).optional(),
  stops: z.array(stopSchema).min(2, t.errors.tooFewStops).max(50),
});

/**
 * Update an existing ItineraryOption in place: recompute routing totals,
 * replace all stops, and update the label. Uses an interactive transaction
 * so the delete + recreate is atomic.
 */
export async function updateOption(input: {
  optionId: string;
  label?: string;
  stops: SaveOptionStop[];
}): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }
  const { optionId, label, stops } = parsed.data;

  const option = await db.itineraryOption.findUnique({
    where: { id: optionId },
    include: { trip: true },
  });
  if (!option) return { ok: false, error: t.errors.invalidOption };

  const points = activeLegPoints(stops);
  const pairs = pairsFrom(points);
  const routes = pairs.length > 0 ? await getRoutes(pairs) : [];
  const legs = assembleLegs(points, routes);
  const blocked = constraintError(option.trip, stops, legs);
  if (blocked) return { ok: false, error: blocked };

  const totalDistanceM = legs.reduce((a, l) => a + l.km * 1000, 0);
  const totalDurationS = legs.reduce((a, l) => a + l.hours * 3600, 0);

  await db.$transaction(async (tx) => {
    await tx.optionStop.deleteMany({ where: { optionId } });
    await tx.itineraryOption.update({
      where: { id: optionId },
      data: {
        label: label && label.length > 0 ? label : null,
        totalDistanceM,
        totalDurationS,
      },
    });
    await tx.optionStop.createMany({
      data: stops.map((s, i) => ({
        optionId,
        order: i,
        name: s.name,
        shortName: s.shortName ?? null,
        lat: s.lat,
        lng: s.lng,
        nights: s.nights,
        bookedNights: s.bookedNights,
        status: s.status,
        isHotel: s.isHotel,
        address: s.address,
        url: s.url,
        phone: s.phone,
      })),
    });
  });

  revalidatePath(OPTIONS_PATH);
  revalidatePath("/");
  return { ok: true };
}

const deleteSchema = z.object({ optionId: z.string().min(1) });

export async function deleteOption(input: {
  optionId: string;
}): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.errors.invalidOption };

  await db.itineraryOption.delete({ where: { id: parsed.data.optionId } });
  revalidatePath(OPTIONS_PATH);
  return { ok: true };
}
