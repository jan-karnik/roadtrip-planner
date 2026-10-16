// Resolve overnight→overnight drives to turn-by-turn deep links. Pure — the
// schedule only carries stop *names*; callers pass coords aligned to the same
// active stop list used to build the schedule.

import type { ScheduleDrive } from "./schedule";

export type LatLng = { lat: number; lng: number };

export type NavStop = {
  /** Same label the schedule uses (`shortName ?? name`). */
  label: string;
  lat: number;
  lng: number;
};

export function stopDisplayLabel(stop: {
  name: string;
  shortName?: string | null;
}): string {
  return stop.shortName ?? stop.name;
}

/** Endpoints for a drive that lands at `destStopName` tonight, or null if labels don't resolve. */
export function driveDirectionsEndpoints(
  drive: ScheduleDrive,
  destStopName: string,
  stops: NavStop[],
): { origin: LatLng; destination: LatLng } | null {
  const destination = stops.find((s) => s.label === destStopName);
  const origin = stops.find((s) => s.label === drive.fromName);
  if (!destination || !origin) return null;
  return {
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
  };
}

export function googleMapsDirectionsUrl(
  origin: LatLng,
  destination: LatLng,
): string {
  const o = `${origin.lat},${origin.lng}`;
  const d = `${destination.lat},${destination.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}&travelmode=driving`;
}

export function appleMapsDirectionsUrl(
  origin: LatLng,
  destination: LatLng,
): string {
  const o = `${origin.lat},${origin.lng}`;
  const d = `${destination.lat},${destination.lng}`;
  return `https://maps.apple.com/?saddr=${encodeURIComponent(o)}&daddr=${encodeURIComponent(d)}&dirflg=d`;
}
