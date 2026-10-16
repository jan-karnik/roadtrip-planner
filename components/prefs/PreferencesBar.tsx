"use client";

import { usePreferences, type MapTheme } from "./PreferencesProvider";
import { ZONES, type ZoneKey } from "@/lib/timezones";
import { DISTANCE_UNITS } from "@/lib/units";
import { t } from "@/lib/i18n";

/** Header toggles for the two display preferences: distance unit + primary zone. */
export function PreferencesBar() {
  const { distanceUnit, setDistanceUnit, primaryZone, setPrimaryZone, mapTheme, setMapTheme } =
    usePreferences();

  const MAP_THEMES: { value: MapTheme; label: string }[] = [
    { value: "night", label: t.prefs.mapThemeNight },
    { value: "day",   label: t.prefs.mapThemeDay },
  ];

  return (
    // On a phone the header is tight: the segment captions, the map-theme
    // toggle and the zone switch drop out, leaving the unit toggle. The zone
    // default (SFO) is the right one on the road, and TimeStamp shows both
    // zones on tap anyway.
    <div className="flex items-center gap-1.5 text-xs sm:gap-4">
      <Segment label={t.prefs.distance}>
        {DISTANCE_UNITS.map((u) => (
          <Opt
            key={u}
            active={distanceUnit === u}
            onClick={() => setDistanceUnit(u)}
          >
            {u}
          </Opt>
        ))}
      </Segment>

      <Segment label={t.prefs.timezone} className="hidden sm:flex">
        {(Object.keys(ZONES) as ZoneKey[]).map((z) => (
          <Opt
            key={z}
            active={primaryZone === z}
            color={ZONES[z].color}
            onClick={() => setPrimaryZone(z)}
          >
            {ZONES[z].label}
          </Opt>
        ))}
      </Segment>

      <Segment label={t.prefs.mapTheme} className="hidden sm:flex">
        {MAP_THEMES.map(({ value, label }) => (
          <Opt
            key={value}
            active={mapTheme === value}
            onClick={() => setMapTheme(value)}
          >
            {label}
          </Opt>
        ))}
      </Segment>
    </div>
  );
}

function Segment({
  label,
  children,
  className = "flex",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`items-center gap-1.5 ${className}`}>
      <span className="hidden text-slate-500 sm:inline">{label}</span>
      <div className="flex overflow-hidden rounded-md border border-base-600">
        {children}
      </div>
    </div>
  );
}

function Opt({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-9 items-center gap-1.5 px-2.5 transition sm:h-7 sm:px-2 ${
        active
          ? "bg-base-600 text-slate-100"
          : "text-slate-400 hover:bg-base-700 hover:text-slate-200"
      }`}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </button>
  );
}
