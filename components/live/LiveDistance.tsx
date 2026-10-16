"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, RefreshCw } from "lucide-react";
import { DistanceDisplay } from "@/components/distance/DistanceDisplay";
import { TimeStamp } from "@/components/time/TimeStamp";
import { getLiveRoute, type LiveRoute } from "@/app/actions/live";
import { haversineKm } from "@/lib/distance";
import { t } from "@/lib/i18n";
import type { LatLng } from "@/lib/types";

// "How far am I from tonight's bed" — the one thing a phone can answer that the
// planner cannot. Geolocation is requested only on an explicit tap: a permission
// prompt on page load is hostile, and the view is fully useful without it.

/** Don't re-route more often than this — a moving car would otherwise spam Mapbox. */
const REFRESH_MS = 60_000;

type Status = "idle" | "locating" | "ready" | "error";

export function LiveDistance({
  destination,
  destinationName,
}: {
  destination: LatLng;
  destinationName: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<LiveRoute>(null);
  const [routeFailed, setRouteFailed] = useState(false);
  const lastFetch = useRef(0);
  // Guards against a stale response landing after a newer one (or after unmount).
  const reqId = useRef(0);

  useEffect(() => {
    // A new destination invalidates any route we already computed.
    setRoute(null);
    setRouteFailed(false);
  }, [destination.lat, destination.lng]);

  const fetchRoute = useCallback(
    (from: LatLng) => {
      const now = Date.now();
      if (now - lastFetch.current < REFRESH_MS && route) return;
      lastFetch.current = now;
      const id = ++reqId.current;
      getLiveRoute(from, destination)
        .then((res) => {
          if (reqId.current !== id) return;
          setRoute(res);
          setRouteFailed(res === null);
        })
        .catch(() => {
          if (reqId.current === id) setRouteFailed(true);
        });
    },
    [destination, route],
  );

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setError(t.live.gps.unavailable);
      return;
    }
    setStatus("locating");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(here);
        setStatus("ready");
        fetchRoute(here);
      },
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? t.live.gps.denied
            : t.live.gps.failed,
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }, [fetchRoute]);

  useEffect(() => () => void ++reqId.current, []);

  if (status === "idle") {
    return (
      <button
        type="button"
        onClick={locate}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white/70 transition-colors active:bg-white/10"
      >
        <Crosshair className="h-4 w-4" />
        {t.live.gps.locate}
      </button>
    );
  }

  if (status === "locating") {
    return (
      <div className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t.live.gps.locating}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-white/50">{error}</p>
        <button
          type="button"
          onClick={locate}
          className="mt-2 min-h-[36px] text-xs font-medium text-accent"
        >
          {t.live.gps.refresh}
        </button>
      </div>
    );
  }

  const directKm = position ? haversineKm(position, destination) : null;
  // Milliseconds of driving left → a wall-clock arrival the dual-zone stamp can
  // render in whichever zone the user reads times in.
  const arrivalIso = route
    ? new Date(Date.now() + route.hours * 3600 * 1000).toISOString()
    : null;

  return (
    <div className="rounded-xl border border-accent/25 bg-accent/10 p-3">
      <div className="flex items-start gap-2">
        <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/50">
            {t.live.gps.toDestination(destinationName)}
          </p>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {route ? (
              <span className="text-lg font-semibold text-white">
                <DistanceDisplay km={route.distanceKm} />
                <span className="ml-1.5 text-sm font-normal text-white/50">
                  {t.live.gps.driving}
                </span>
              </span>
            ) : (
              directKm !== null && (
                <span className="text-lg font-semibold text-white">
                  <DistanceDisplay km={directKm} />
                  <span className="ml-1.5 text-sm font-normal text-white/50">
                    {t.live.gps.directLine}
                  </span>
                </span>
              )
            )}
          </div>

          {route && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-white/60">
              <span className="font-medium text-white/80">
                {t.units.duration(route.hours)}
              </span>
              {arrivalIso && (
                <>
                  <span className="text-white/25">·</span>
                  <span>{t.live.gps.arrivalAt}</span>
                  <TimeStamp iso={arrivalIso} />
                </>
              )}
            </p>
          )}

          {routeFailed && directKm !== null && (
            <p className="mt-1 text-[11px] text-white/40">
              {t.live.gps.routeFailed}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={locate}
          aria-label={t.live.gps.refresh}
          className="-m-2 shrink-0 p-2 text-white/40 transition-colors active:text-white"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
