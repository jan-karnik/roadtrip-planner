"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Menu, X, MapPin, CarFront } from "lucide-react";
import { usePreferences } from "@/components/prefs/PreferencesProvider";
import { getRoutes } from "@/app/actions/routes";
import {
  assembleLegs,
  activeLegPoints,
  pairsFrom,
  withSegmentExertion,
  pointAlongLegs,
  type RouteResult,
} from "@/lib/legs";
import {
  buildSchedule,
  formatCivilDateShort,
  formatStaySpan,
} from "@/lib/schedule";
import { stopDisplayLabel } from "@/lib/driveNav";
import { civilNoon, resolveLiveState, nightStopIndices } from "@/lib/live";
import { ZONES, hourOfDayInZone } from "@/lib/timezones";
import { t } from "@/lib/i18n";
import { constraintViolationMessage } from "@/lib/constraintMessages";
import {
  listSaveBlockingViolations,
  softDailyDriveWarnings,
} from "@/lib/itineraryViolations";
import {
  clearMapDraft,
  draftDiffersFrom,
  mapDraftStorageKey,
  readMapDraft,
  resolveDraftScope,
  writeMapDraft,
} from "@/lib/draftStorage";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RouteTimeline } from "./RouteTimeline";
import { AddStopForm, type AddStopInput } from "./AddStopForm";
import { DaySchedule } from "./DaySchedule";
import { DraftNameEditor } from "./DraftNameEditor";
import { TripSummaryBar } from "./TripSummaryBar";
import type { PickablePlace, SnapshotStop } from "./types";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-white/30">
      …
    </div>
  ),
});

const sumKm = (legs: { km: number }[]) => legs.reduce((a, l) => a + l.km, 0);
const sumHours = (legs: { hours: number }[]) =>
  legs.reduce((a, l) => a + l.hours, 0);

type Tab = "trasa" | "days";

// Rough assumed driving window (SFO-local hours) used to place the "where we
// are" marker along today's leg when there's no GPS fix: before it, still at
// the start; after it, arrived. It's a guess, not a schedule — good enough for
// "roughly where we'd be right now".
const ASSUMED_DRIVE_START_HOUR = 9;
const ASSUMED_DRIVE_END_HOUR = 18;

export function MapPlanner({
  tripId,
  tripName,
  initialStops,
  tripStart,
  tripEnd,
  availablePlaces = [],
  viewingOption,
}: {
  tripId: string;
  tripName: string;
  initialStops: SnapshotStop[];
  tripStart: string | null;
  tripEnd: string | null;
  availablePlaces?: PickablePlace[];
  viewingOption?: { id: string; seq: number; label: string | null };
}) {
  const searchParams = useSearchParams();
  const hasExplicitOption = searchParams.has("option");
  const { distanceUnit, mapTheme } = usePreferences();
  const [baseline, setBaseline] = useState<SnapshotStop[]>(initialStops);
  const [baselineName, setBaselineName] = useState(
    viewingOption?.label ?? "",
  );
  const [draft, setDraft] = useState<SnapshotStop[]>(initialStops);
  const [hoveredLegIndex, setHoveredLegIndex] = useState<number | null>(null);
  const [hoveredDayLegs, setHoveredDayLegs] = useState<Set<number> | null>(null);

  const handleHoverLeg = useCallback((index: number | null) => {
    setHoveredDayLegs(null);
    setHoveredLegIndex(index);
  }, []);

  const handleHoverDay = useCallback((indices: number[] | null) => {
    setHoveredLegIndex(null);
    setHoveredDayLegs(indices ? new Set(indices) : null);
  }, []);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [originalKm, setOriginalKm] = useState(0);
  const [originalHours, setOriginalHours] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("trasa");
  const [draftName, setDraftName] = useState(viewingOption?.label ?? "");
  const [panelOpen, setPanelOpen] = useState(false);
  // Draft index where the next added stop lands (null = append).
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  // When on, clicking the map drops a coordinate-named point.
  const [pinDropMode, setPinDropMode] = useState(false);
  const [restoredFromBrowser, setRestoredFromBrowser] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  const draftScope = useMemo(
    () => resolveDraftScope(viewingOption?.id, initialStops.length),
    [viewingOption?.id, initialStops.length],
  );
  const storageKey = useMemo(
    () => mapDraftStorageKey(tripId, draftScope),
    [tripId, draftScope],
  );

  // Restore an unsaved draft from localStorage (once per storage scope).
  useEffect(() => {
    setStorageReady(false);
    setBaseline(initialStops);
    const serverName = viewingOption?.label ?? "";
    setBaselineName(serverName);
    const stored = readMapDraft(storageKey);
    if (stored && draftDiffersFrom(stored.stops, initialStops)) {
      setDraft(stored.stops);
      setDraftName(stored.draftName);
      setRestoredFromBrowser(true);
    } else {
      setDraft(initialStops);
      setDraftName(serverName);
      setRestoredFromBrowser(false);
    }
    setStorageReady(true);
    // Only re-run when the planner context (Variant / create / seed) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialStops is the server baseline at scope entry
  }, [storageKey]);

  // Persist draft edits so a reload doesn't lose POI work.
  useEffect(() => {
    if (!storageReady) return;
    writeMapDraft(storageKey, { stops: draft, draftName });
  }, [draft, draftName, storageKey, storageReady]);

  const activePoints = useMemo(() => activeLegPoints(draft), [draft]);

  const reqId = useRef(0);
  useEffect(() => {
    const pairs = pairsFrom(activePoints);
    if (pairs.length === 0) {
      setRoutes([]);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    getRoutes(pairs)
      .then((res) => {
        if (reqId.current === id) {
          setRoutes(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (reqId.current === id) {
          setRoutes([]);
          setLoading(false);
        }
      });
  }, [activePoints]);

  useEffect(() => {
    const points = activeLegPoints(baseline);
    const pairs = pairsFrom(points);
    if (pairs.length === 0) {
      setOriginalKm(0);
      setOriginalHours(0);
      return;
    }
    let cancelled = false;
    getRoutes(pairs)
      .then((res) => {
        if (!cancelled) {
          const base = assembleLegs(points, res);
          setOriginalKm(sumKm(base));
          setOriginalHours(sumHours(base));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOriginalKm(0);
          setOriginalHours(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [baseline]);

  const activeStops = useMemo(
    () => draft.filter((s) => s.status !== "SKIPPED"),
    [draft],
  );

  // Colour grading follows the whole overnight→overnight segment, not the
  // individual hop: three short hops in one day should read as one long drive.
  const legs = useMemo(
    () =>
      withSegmentExertion(
        assembleLegs(activePoints, routes),
        activeStops.map((s) => s.nights),
      ),
    [activePoints, routes, activeStops],
  );

  const draftKm = useMemo(() => sumKm(legs), [legs]);
  const draftHours = useMemo(() => sumHours(legs), [legs]);

  const navStops = useMemo(
    () =>
      activeStops.map((s) => ({
        label: stopDisplayLabel(s),
        lat: s.lat,
        lng: s.lng,
      })),
    [activeStops],
  );

  const schedule = useMemo(() => {
    if (!tripStart || !tripEnd) return null;
    return buildSchedule({
      tripStart: new Date(tripStart),
      tripEnd: new Date(tripEnd),
      zone: ZONES.SFO.id,
      stops: activeStops.map((s) => ({
        name: s.name,
        shortName: s.shortName,
        nights: s.nights,
      })),
      legs: legs.map((l) => ({ km: l.km, hours: l.hours })),
    });
  }, [tripStart, tripEnd, activeStops, legs]);

  const legMetrics = useMemo(
    () => legs.map((l) => ({ km: l.km, hours: l.hours })),
    [legs],
  );

  const saveBlockMessage = useMemo(() => {
    if (!tripStart || !tripEnd) return null;
    const window = {
      start: new Date(tripStart),
      end: new Date(tripEnd),
      zone: ZONES.SFO.id,
    };
    const violations = listSaveBlockingViolations(draft, legMetrics, window);
    if (violations.length === 0) return null;
    return constraintViolationMessage(violations[0]);
  }, [draft, legMetrics, tripStart, tripEnd]);

  const softPaceWarning = useMemo(() => {
    const soft = softDailyDriveWarnings(draft, legMetrics);
    if (soft.length === 0) return null;
    return constraintViolationMessage(soft[0]);
  }, [draft, legMetrics]);

  // Per-stop stay spans (id → "15. → 16. 8.", i.e. check-in → check-out) for the
  // map's night labels. perStop aligns positionally to the active stops the
  // schedule was built over.
  const dateRangeById = useMemo(() => {
    const out: Record<string, string> = {};
    if (!schedule) return out;
    activeStops.forEach((s, i) => {
      const ps = schedule.perStop[i];
      if (ps?.nights && ps.firstDate && ps.lastDate) {
        out[s.id] = formatStaySpan(ps.firstDate, ps.lastDate);
      }
    });
    return out;
  }, [schedule, activeStops]);

  // Today's civil date in the trip's zone (SFO): at 23:00 in Prague it's still
  // afternoon in California. Client-only (a server-rendered date mismatches on
  // hydration) and re-ticked so an open map rolls over at midnight.
  const [today, setToday] = useState<Date | null>(null);
  const [nowInstant, setNowInstant] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNowInstant(n);
      setToday(civilNoon(n, ZONES.SFO.id));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Which day each travel-day segment is driven (leg index → "Dnes" / "Zítra" /
  // "17. 8."). The label sits on the segment's longest leg so one badge marks a
  // whole nocleh→nocleh day rather than every hop inside it.
  const legDayLabels = useMemo(() => {
    const out: Record<number, string> = {};
    if (!schedule) return out;
    for (const night of schedule.nights) {
      const indices = night.drive?.legIndices ?? [];
      if (indices.length === 0) continue;
      const anchor = indices.reduce((best, i) =>
        (legs[i]?.km ?? 0) > (legs[best]?.km ?? 0) ? i : best,
      );
      const offset = today
        ? Math.round((night.date.getTime() - today.getTime()) / 86_400_000)
        : null;
      out[anchor] =
        offset === 0
          ? t.map.today
          : offset === 1
            ? t.map.tomorrow
            : formatCivilDateShort(night.date);
    }
    return out;
  }, [schedule, legs, today]);

  // Where to open the map by default: mid-trip, today's drive (or tonight's
  // stop on a rest day) instead of fitting the whole 17-night route — which on
  // a phone can zoom out far enough to feel like it opened somewhere random.
  const focusPoint = useMemo(() => {
    if (!schedule || !today) return null;
    const live = resolveLiveState(schedule, today, ZONES.SFO.id);
    if (live.phase !== "during" || live.currentIndex == null) return null;
    const night = live.nights[live.currentIndex];
    const legIndices = night.drive?.legIndices ?? [];
    if (legIndices.length > 0) {
      const anchor = legIndices.reduce((best, i) =>
        (legs[i]?.km ?? 0) > (legs[best]?.km ?? 0) ? i : best,
      );
      const leg = legs[anchor];
      if (leg) {
        return {
          lat: (leg.from.lat + leg.to.lat) / 2,
          lng: (leg.from.lng + leg.to.lng) / 2,
        };
      }
    }
    const stopIndex = nightStopIndices(schedule)[live.currentIndex];
    const stop = activeStops[stopIndex];
    return stop ? { lat: stop.lat, lng: stop.lng } : null;
  }, [schedule, today, legs, activeStops]);

  // "Where we are" marker: a real GPS fix when the user opts in, else a
  // time-of-day estimate along today's leg (or tonight's stop on a rest day).
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gpsPosition, setGpsPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDenied, setGpsDenied] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const toggleGps = useCallback(() => {
    if (gpsEnabled) {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setGpsEnabled(false);
      setGpsPosition(null);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsDenied(true);
      return;
    }
    setGpsDenied(false);
    setGpsEnabled(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setGpsPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setGpsDenied(true);
        setGpsEnabled(false);
        setGpsPosition(null);
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
    );
  }, [gpsEnabled]);

  useEffect(
    () => () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    },
    [],
  );

  const estimatedCarPosition = useMemo(() => {
    if (!schedule || !today || !nowInstant) return null;
    const live = resolveLiveState(schedule, today, ZONES.SFO.id);
    if (live.phase !== "during" || live.currentIndex == null) return null;
    const night = live.nights[live.currentIndex];
    const legIndices = night.drive?.legIndices ?? [];
    if (legIndices.length > 0) {
      const hour = hourOfDayInZone(nowInstant, ZONES.SFO.id);
      const fraction =
        (hour - ASSUMED_DRIVE_START_HOUR) /
        (ASSUMED_DRIVE_END_HOUR - ASSUMED_DRIVE_START_HOUR);
      return pointAlongLegs(legs, legIndices, fraction);
    }
    const stopIndex = nightStopIndices(schedule)[live.currentIndex];
    const stop = activeStops[stopIndex];
    return stop ? { lat: stop.lat, lng: stop.lng } : null;
  }, [schedule, today, nowInstant, legs, activeStops]);

  const carPosition = gpsPosition ?? estimatedCarPosition;
  const carIsLive = gpsPosition != null;

  const dirty = useMemo(
    () => draftDiffersFrom(draft, baseline),
    [draft, baseline],
  );

  const labelDirty = useMemo(
    () => draftName.trim() !== baselineName.trim(),
    [draftName, baselineName],
  );

  const draftDirty = dirty || labelDirty;

  const commitPersistedDraft = useCallback(
    ({
      label,
      stops: persistedStops,
    }: {
      label: string;
      stops: SnapshotStop[];
    }) => {
      const trimmed = label.trim();
      setBaseline(persistedStops);
      setBaselineName(trimmed);
      setDraftName(trimmed);
      setRestoredFromBrowser(false);
      writeMapDraft(storageKey, {
        stops: persistedStops,
        draftName: trimmed,
      });
    },
    [storageKey],
  );

  useEffect(() => {
    if (!draftDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draftDirty]);

  function reorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setDraft((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
    setHoveredLegIndex(null);
    setHoveredDayLegs(null);
  }

  function toggleSkip(id: string) {
    setDraft((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === "SKIPPED" ? "PLANNED" : "SKIPPED" }
          : s,
      ),
    );
    setHoveredLegIndex(null);
    setHoveredDayLegs(null);
  }

  function setNights(id: string, nights: number) {
    setDraft((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, nights: Math.max(0, nights) } : s,
      ),
    );
  }

  // Append, or insert at `atIndex` (defaults to the active insert target). The
  // target is cleared afterwards so the next plain add appends again.
  function addStop(input: AddStopInput, atIndex?: number) {
    const at = atIndex ?? insertIndex;
    setDraft((prev) => {
      const key = input.lat.toFixed(4) + "," + input.lng.toFixed(4);
      if (prev.some((s) => s.lat.toFixed(4) + "," + s.lng.toFixed(4) === key)) {
        return prev;
      }
      const stop: SnapshotStop = {
        id: crypto.randomUUID(),
        name: input.name,
        shortName: input.shortName,
        lat: input.lat,
        lng: input.lng,
        nights: 0,
        bookedNights: 0,
        status: "PLANNED",
        // A stop added from the picker is a place, not an accommodation —
        // hotels come from the seed data (prisma/sampleLiveVariant.ts).
        isHotel: false,
        address: null,
        url: null,
        phone: null,
      };
      if (at != null && at >= 0 && at <= prev.length) {
        const next = [...prev];
        next.splice(at, 0, stop);
        return next;
      }
      return [...prev, stop];
    });
    setInsertIndex(null);
  }

  // Arm the timeline insert target (and make sure the Trasa tab is showing so
  // the add-stop form + its banner are visible).
  function requestInsertAt(index: number) {
    setInsertIndex(index);
    setActiveTab("trasa");
  }

  function cancelInsert() {
    setInsertIndex(null);
  }

  // Drop a coordinate-named point at a map-clicked location (pin-drop mode).
  function handleMapClick(lng: number, lat: number) {
    const name = t.map.customPointName(lat, lng);
    addStop({ name, shortName: name, lat, lng, osmId: null });
  }

  function removeFromDraft(id: string) {
    setDraft((prev) => prev.filter((s) => s.id !== id));
    setHoveredLegIndex(null);
    setHoveredDayLegs(null);
  }

  function reset() {
    clearMapDraft(storageKey);
    setDraft(baseline);
    setDraftName(baselineName);
    setRestoredFromBrowser(false);
    setHoveredLegIndex(null);
    setHoveredDayLegs(null);
    setInsertIndex(null);
  }

  // Banner copy for the add-stop form while an insert target is armed.
  const insertBanner = useMemo(() => {
    if (insertIndex == null) return null;
    if (insertIndex <= 0) return t.addStop.insertingAtStart;
    const prev = draft[insertIndex - 1];
    return t.addStop.insertingAfter(prev?.shortName ?? prev?.name ?? "");
  }, [insertIndex, draft]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "trasa", label: t.map.tabs.route },
    { id: "days", label: t.map.tabs.days },
  ];

  return (
    // h-[calc(100dvh-56px)] = full viewport minus the fixed 56px header
    <div className="relative h-[calc(100dvh-56px)] w-full overflow-hidden">
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        <MapView
          legs={legs}
          stops={draft}
          dateRanges={dateRangeById}
          legDayLabels={legDayLabels}
          hoveredLegIndex={hoveredLegIndex}
          onHoverLeg={handleHoverLeg}
          hoveredDayLegs={hoveredDayLegs}
          onSetStopNights={setNights}
          onToggleStopSkip={toggleSkip}
          distanceUnit={distanceUnit}
          mapTheme={mapTheme}
          pinDropMode={pinDropMode}
          onMapClick={({ lng, lat }) => handleMapClick(lng, lat)}
          focusPoint={focusPoint}
          carPosition={carPosition}
          carIsLive={carIsLive}
        />
      </div>

      {/* Pin-drop toggle (top-left of the map) + active hint banner */}
      <button
        type="button"
        onClick={() => setPinDropMode((v) => !v)}
        aria-pressed={pinDropMode}
        className={`pointer-events-auto absolute left-4 top-4 z-20 inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium shadow-lg backdrop-blur-md transition ${
          pinDropMode
            ? "border-accent bg-accent text-black"
            : "border-white/20 bg-black/60 text-white hover:bg-black/80"
        }`}
      >
        <MapPin className="h-4 w-4" />
        {pinDropMode ? t.map.pinDropDone : t.map.pinDrop}
      </button>
      {pinDropMode && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-accent/40 bg-black/70 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-md">
          {t.map.pinDropHint}
        </div>
      )}

      {/* GPS toggle — a real fix when granted, else the marker just estimates
          from the time of day (see estimatedCarPosition above). */}
      {estimatedCarPosition && (
        <button
          type="button"
          onClick={toggleGps}
          aria-pressed={gpsEnabled}
          className={`pointer-events-auto absolute left-4 top-16 z-20 inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium shadow-lg backdrop-blur-md transition ${
            gpsEnabled
              ? "border-accent bg-accent text-black"
              : "border-white/20 bg-black/60 text-white hover:bg-black/80"
          }`}
        >
          <CarFront className="h-4 w-4" />
          {gpsEnabled ? t.map.locateOn : t.map.locate}
        </button>
      )}
      {gpsDenied && (
        <div className="pointer-events-none absolute left-4 top-28 z-20 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-xs text-white/70 shadow-lg backdrop-blur-md">
          {t.map.locateDenied}
        </div>
      )}

      {/* Mobile panel toggle button (hidden on md+) */}
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="pointer-events-auto absolute bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-lg backdrop-blur-md transition hover:bg-black/80 md:hidden"
        aria-label={t.map.togglePanel}
      >
        {panelOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Right overlay panel — desktop: always visible; mobile: slide-in drawer */}
      <aside
        className={`
          pointer-events-none
          absolute bottom-14 right-0 top-0 flex w-[min(500px,92vw)] flex-col gap-3 p-4
          transition-transform duration-300
          ${panelOpen ? "translate-x-0" : "translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* Draft name editor card */}
        <DraftNameEditor value={draftName} onChange={setDraftName} />

        {restoredFromBrowser && draftDirty && (
          <div className="pointer-events-auto rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {t.map.draftRestored}
          </div>
        )}

        {/* Viewing option banner */}
        {viewingOption && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-accent/30 bg-black/50 px-4 py-2.5 text-sm backdrop-blur-md">
            <span className="font-medium text-accent">
              {t.options.viewing(viewingOption.seq)}
            </span>
            {viewingOption.label && (
              <span className="truncate text-white/70">{viewingOption.label}</span>
            )}
            {hasExplicitOption && (
              <Link
                href="/?planner=1"
                className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-white/20 px-2.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t.options.backToLive}
              </Link>
            )}
          </div>
        )}

        {/* Tabbed content card */}
        <div className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-xl backdrop-blur-md">
          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-xs font-medium uppercase tracking-wide transition ${
                  activeTab === tab.id
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable tab content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {activeTab === "trasa" && (
              <div className="flex flex-col gap-3">
                <AddStopForm
                  availablePlaces={availablePlaces}
                  draft={draft}
                  onAddStop={addStop}
                  insertBanner={insertBanner}
                  onCancelInsert={cancelInsert}
                />
                <div className="h-px bg-white/10" />
                <RouteTimeline
                  stops={draft}
                  legs={legs}
                  hoveredLegIndex={hoveredLegIndex}
                  onHoverLeg={handleHoverLeg}
                  onReorder={reorder}
                  onToggleSkip={toggleSkip}
                  onRemove={removeFromDraft}
                  onSetNights={setNights}
                  onInsertAt={requestInsertAt}
                  insertIndex={insertIndex}
                  dirty={draftDirty}
                  onReset={reset}
                />
              </div>
            )}
            {activeTab === "days" && (
              <DaySchedule
                schedule={schedule}
                arriveIso={tripStart}
                departIso={tripEnd}
                hoveredDayLegs={hoveredDayLegs}
                onHoverDay={handleHoverDay}
                navStops={navStops}
              />
            )}
          </div>
        </div>
      </aside>

      {/* Bottom summary bar */}
      <TripSummaryBar
        tripId={tripId}
        stops={draft}
        draftName={draftName}
        originalLabel={baselineName}
        totalKm={draftKm}
        totalHours={draftHours}
        totalNights={schedule?.totalNights}
        tripNights={schedule?.tripNights}
        nightFit={schedule?.fit}
        deltaKm={draftKm - originalKm}
        deltaHours={draftHours - originalHours}
        dirty={draftDirty}
        loading={loading}
        optionId={viewingOption?.id}
        viewingSeq={viewingOption?.seq}
        saveBlockMessage={saveBlockMessage}
        softPaceWarning={softPaceWarning}
        onDraftPersisted={commitPersistedDraft}
      />
    </div>
  );
}
