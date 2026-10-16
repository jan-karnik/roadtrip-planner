"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2, Search, MapPin, Plus, Globe, X } from "lucide-react";
import { searchPlaces } from "@/app/actions/itinerary";
import { type GeocodeResult } from "@/lib/geocode";
import { t } from "@/lib/i18n";
import type { PickablePlace, SnapshotStop } from "./types";

/** What the picker hands back when a place is chosen (no DB write). */
export type AddStopInput = {
  name: string;
  shortName: string | null;
  lat: number;
  lng: number;
  osmId: string | null;
};

/** React list key: osmId when present, else rounded coordinates. */
function keyOf(p: { osmId: string | null; lat: number; lng: number }): string {
  return p.osmId ?? coordKey(p);
}

/** Coordinate identity (~11m) used to dedup against the current draft. */
function coordKey(p: { lat: number; lng: number }): string {
  return `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
}

/**
 * Add-stop picker for the map draft sandbox. Searches in-app POIs (filtered
 * client-side) and, on demand, real places via Nominatim (`searchPlaces`). It
 * NEVER writes to the DB — picking a result calls `onAddStop`, which only
 * appends to the client draft. DB writes happen later via Save (saveOption).
 */
export function AddStopForm({
  availablePlaces,
  draft,
  onAddStop,
  insertBanner = null,
  onCancelInsert,
}: {
  availablePlaces: PickablePlace[];
  draft: SnapshotStop[];
  onAddStop: (input: AddStopInput) => void;
  /** When set, an insert target is armed — the next pick lands at that gap. */
  insertBanner?: string | null;
  onCancelInsert?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the search box when an insert target is armed from the timeline.
  useEffect(() => {
    if (insertBanner) inputRef.current?.focus();
  }, [insertBanner]);

  const draftKeys = useMemo(
    () => new Set(draft.map((s) => coordKey(s))),
    [draft],
  );

  const q = query.trim().toLowerCase();
  const inApp = useMemo(() => {
    if (q.length < 1) return [];
    return availablePlaces
      .filter((p) => {
        const hay = `${p.shortName ?? ""} ${p.name} ${p.region ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [availablePlaces, q]);

  function runOnlineSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (term.length < 2) return;
    setError(null);
    startSearch(async () => {
      const res = await searchPlaces({ query: term });
      if (res.ok) {
        setCandidates(res.candidates);
      } else {
        setError(res.error);
        setCandidates(null);
      }
    });
  }

  function addInApp(p: PickablePlace) {
    onAddStop({
      name: p.name,
      shortName: p.shortName,
      lat: p.lat,
      lng: p.lng,
      osmId: p.osmId,
    });
  }

  function addCandidate(c: GeocodeResult) {
    onAddStop({
      name: c.name,
      shortName: c.shortName,
      lat: c.lat,
      lng: c.lng,
      osmId: c.osmId,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {insertBanner && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs text-accent">
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{insertBanner}</span>
          <button
            type="button"
            onClick={onCancelInsert}
            title={t.addStop.cancelInsert}
            className="shrink-0 rounded p-0.5 text-accent/70 transition hover:bg-white/10 hover:text-accent"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <form onSubmit={runOnlineSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            placeholder={t.addStop.searchPlaceholder}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-2 text-sm text-white placeholder:text-white/30 focus:border-accent/60 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={searching || query.trim().length < 2}
          title={t.addStop.searchOnline}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {searching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Globe className="h-3.5 w-3.5" />
          )}
          {t.addStop.searchOnline}
        </button>
      </form>

      {error && <p className="text-xs text-rose-300">{error}</p>}

      {/* In-app matches */}
      {q.length >= 1 && (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/30">
            {t.addStop.inAppMatches}
          </p>
          {inApp.length === 0 ? (
            <p className="px-1 py-1 text-xs text-white/30">
              {t.addStop.noMatches(query.trim())}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {inApp.map((p) => (
                <ResultRow
                  key={keyOf(p)}
                  title={p.shortName ?? p.name}
                  subtitle={p.region ?? p.name}
                  added={draftKeys.has(coordKey(p))}
                  onAdd={() => addInApp(p)}
                  icon={<MapPin className="h-3.5 w-3.5 shrink-0 text-accent/70" />}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Online candidates */}
      {candidates !== null && (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/30">
            {t.addStop.onlineResults}
          </p>
          {candidates.length === 0 ? (
            <p className="px-1 py-1 text-xs text-white/30">
              {t.addStop.noResults(query.trim())}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {candidates.map((c) => (
                <ResultRow
                  key={c.osmId}
                  title={c.shortName}
                  subtitle={c.name}
                  added={draftKeys.has(coordKey(c))}
                  onAdd={() => addCandidate(c)}
                  icon={<Globe className="h-3.5 w-3.5 shrink-0 text-accent/70" />}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ResultRow({
  title,
  subtitle,
  added,
  onAdd,
  icon,
}: {
  title: string;
  subtitle: string;
  added: boolean;
  onAdd: () => void;
  icon: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onAdd}
        disabled={added}
        className="group flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-left transition hover:border-accent/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:bg-white/5"
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">
            {title}
          </span>
          <span className="block truncate text-[11px] text-white/40">
            {subtitle}
          </span>
        </span>
        {added ? (
          <span className="shrink-0 text-[10px] text-white/40">
            {t.addStop.alreadyAdded}
          </span>
        ) : (
          <Plus className="h-4 w-4 shrink-0 text-white/40 transition group-hover:text-accent" />
        )}
      </button>
    </li>
  );
}
