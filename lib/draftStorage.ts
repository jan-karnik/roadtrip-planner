import { z } from "zod";
import { isStopStatus } from "./types";

/** Minimal stop shape persisted in the map draft sandbox. */
export type PersistedDraftStop = z.infer<typeof snapshotStopSchema>;

const STORAGE_VERSION = 1 as const;

export const snapshotStopSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  nights: z.number().int().min(0),
  bookedNights: z.number().int().min(0),
  status: z.string().refine(isStopStatus),
  isHotel: z.boolean(),
  address: z.string().nullable(),
  url: z.string().nullable(),
  phone: z.string().nullable(),
});

const storedDraftSchema = z.object({
  v: z.literal(STORAGE_VERSION),
  stops: z.array(snapshotStopSchema),
  draftName: z.string(),
  savedAt: z.number(),
});

export type StoredMapDraft = z.infer<typeof storedDraftSchema>;

/** Stable localStorage scope for one planner context (Variant, seed fallback, or /create). */
export function resolveDraftScope(
  viewingOptionId: string | undefined,
  initialStopCount: number,
): string {
  if (viewingOptionId) return viewingOptionId;
  if (initialStopCount === 0) return "create";
  return "seed";
}

export function mapDraftStorageKey(tripId: string, scope: string): string {
  return `rtp.mapDraft.v${STORAGE_VERSION}.${tripId}.${scope}`;
}

export function draftDiffersFrom(
  draft: Pick<PersistedDraftStop, "id" | "status" | "nights">[],
  baseline: Pick<PersistedDraftStop, "id" | "status" | "nights">[],
): boolean {
  if (draft.length !== baseline.length) return true;
  return draft.some(
    (s, i) =>
      s.id !== baseline[i]?.id ||
      s.status !== baseline[i]?.status ||
      s.nights !== baseline[i]?.nights,
  );
}

export function readMapDraft(key: string): StoredMapDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = storedDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeMapDraft(
  key: string,
  payload: { stops: PersistedDraftStop[]; draftName: string },
): void {
  if (typeof window === "undefined") return;
  try {
    const body: StoredMapDraft = {
      v: STORAGE_VERSION,
      stops: payload.stops,
      draftName: payload.draftName,
      savedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(body));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearMapDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
