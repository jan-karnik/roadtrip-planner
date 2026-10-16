"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { DistanceUnit } from "@/lib/units";
import type { ZoneKey } from "@/lib/timezones";

// Per-user display preferences. Client-only and persisted to localStorage —
// these are view settings, not shared trip data, so they never touch the DB.

export type MapTheme = "night" | "day";

type Preferences = {
  distanceUnit: DistanceUnit;
  primaryZone: ZoneKey;
  mapTheme: MapTheme;
  setDistanceUnit: (u: DistanceUnit) => void;
  setPrimaryZone: (z: ZoneKey) => void;
  setMapTheme: (t: MapTheme) => void;
  onboardingSeen: boolean;
  dismissOnboarding: () => void;
  showOnboarding: () => void;
};

const DEFAULT_DISTANCE_UNIT: DistanceUnit = "km";
const DEFAULT_PRIMARY_ZONE: ZoneKey = "SFO";
const DEFAULT_MAP_THEME: MapTheme = "day";
const STORAGE_KEY = "rtp.prefs";

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(
    DEFAULT_DISTANCE_UNIT,
  );
  const [primaryZone, setPrimaryZone] = useState<ZoneKey>(DEFAULT_PRIMARY_ZONE);
  const [mapTheme, setMapTheme] = useState<MapTheme>(DEFAULT_MAP_THEME);
  // Default true so SSR + first render both agree (no overlay flash before hydration).
  // Set to false after mount if localStorage has no 'seen' record.
  const [onboardingSeen, setOnboardingSeen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted prefs AFTER mount so the server markup and the first client
  // render both use defaults (no hydration mismatch); then apply the saved values.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Preferences>;
        if (p.distanceUnit === "km" || p.distanceUnit === "mi") {
          setDistanceUnit(p.distanceUnit);
        }
        if (p.primaryZone === "SFO" || p.primaryZone === "PRG") {
          setPrimaryZone(p.primaryZone);
        }
        if (p.mapTheme === "night" || p.mapTheme === "day") {
          setMapTheme(p.mapTheme);
        }
      }
      setOnboardingSeen(localStorage.getItem("rtp.onboarding") === "seen");
    } catch {
      // ignore malformed/unavailable storage
    }
    setHydrated(true);
  }, []);

  // Persist on change, but only once we've loaded — otherwise the initial
  // defaults would clobber stored values before they're read.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ distanceUnit, primaryZone, mapTheme }),
      );
    } catch {
      // ignore unavailable storage
    }
  }, [hydrated, distanceUnit, primaryZone, mapTheme]);

  function dismissOnboarding() {
    setOnboardingSeen(true);
    try { localStorage.setItem("rtp.onboarding", "seen"); } catch { /* ignore */ }
  }

  function showOnboarding() {
    setOnboardingSeen(false);
  }

  return (
    <PreferencesContext.Provider
      value={{
        distanceUnit,
        primaryZone,
        mapTheme,
        setDistanceUnit,
        setPrimaryZone,
        setMapTheme,
        onboardingSeen,
        dismissOnboarding,
        showOnboarding,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): Preferences {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return ctx;
}
