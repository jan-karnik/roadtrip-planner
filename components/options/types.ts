import type { StopStatus } from "@/lib/types";

/** A saved option's stop, as sent to the client (frozen snapshot). */
export type OptionStopView = {
  name: string;
  shortName: string | null;
  lat: number;
  lng: number;
  nights: number;
  status: StopStatus;
};

/** A saved itinerary option, serialized for the ranking/comparison view. */
export type OptionView = {
  id: string;
  seq: number;
  label: string | null;
  /** Total driving distance over the active route, km. */
  totalKm: number;
  /** Total driving time over the active route, hours. */
  totalHours: number;
  /** Σ nights over the active (non-skipped) stops. */
  totalNights: number;
  stops: OptionStopView[];
};

export type SortKey = "time" | "distance";
