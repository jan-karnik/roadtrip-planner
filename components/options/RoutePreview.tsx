import type { OptionStopView } from "./types";

// Fixed west-coast bounding box (matches MapView's WEST_COAST_BOUNDS) so every
// preview shares the same frame and routes are visually comparable at a glance.
const WEST = -124.5;
const EAST = -109.0;
const SOUTH = 31.3;
const NORTH = 42.1;

const W = 150;
const H = 105;
const PAD = 10;

function project(lat: number, lng: number): [number, number] {
  const x = PAD + ((lng - WEST) / (EAST - WEST)) * (W - 2 * PAD);
  const y = PAD + ((NORTH - lat) / (NORTH - SOUTH)) * (H - 2 * PAD);
  return [x, y];
}

/**
 * Tiny static SVG sketch of an option's route over the west coast: a straight
 * polyline + dots through the active (non-skipped) stops, with skipped stops as
 * faint grey marks. Pure/serverside — no Mapbox tiles or token cost per card.
 */
export function RoutePreview({ stops }: { stops: OptionStopView[] }) {
  const active = stops.filter((s) => s.status !== "SKIPPED");
  const skipped = stops.filter((s) => s.status === "SKIPPED");
  const path = active.map((s) => project(s.lat, s.lng));
  const polyline = path.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[105px] w-[150px] shrink-0 rounded-md border border-base-700 bg-base-900"
      role="img"
      aria-hidden
    >
      {skipped.map((s, i) => {
        const [x, y] = project(s.lat, s.lng);
        return <circle key={`s${i}`} cx={x} cy={y} r={2} fill="#475569" />;
      })}
      {path.length >= 2 && (
        <polyline
          points={polyline}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
      )}
      {path.map(([x, y], i) => (
        <circle
          key={`a${i}`}
          cx={x}
          cy={y}
          r={i === 0 || i === path.length - 1 ? 3 : 2.2}
          fill={i === 0 ? "#34d399" : i === path.length - 1 ? "#f87171" : "#38bdf8"}
        />
      ))}
    </svg>
  );
}
