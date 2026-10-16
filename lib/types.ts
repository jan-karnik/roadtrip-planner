// Shared domain types and constants.

export const STOP_STATUSES = ["PLANNED", "VISITED", "SKIPPED"] as const;
export type StopStatus = (typeof STOP_STATUSES)[number];

export function isStopStatus(value: string): value is StopStatus {
  return (STOP_STATUSES as readonly string[]).includes(value);
}

// Display labels for statuses live in lib/i18n.ts (t.status), not here —
// these constants stay language-neutral (English keys).

export type LatLng = { lat: number; lng: number };
