"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { t } from "@/lib/i18n";
import { formatDistance, type DistanceUnit } from "@/lib/units";
import type { Leg } from "@/lib/legs";
import type { MapTheme } from "@/components/prefs/PreferencesProvider";
import type { SnapshotStop } from "./types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Classic Mapbox styles — no global colour grading applied to custom layers, so
// route/POI colours render true (the reason we don't use the Standard style).
// Outdoors gives the day map terrain shading + green parks for a livelier
// national-parks feel; dark-v11 keeps night-mode routes readable.
const STYLE_URL: Record<MapTheme, string> = {
  day: "mapbox://styles/mapbox/outdoors-v12",
  night: "mapbox://styles/mapbox/dark-v11",
};

const WEST_COAST_BOUNDS: [[number, number], [number, number]] = [
  [-128.0, 30.0],
  [-109.0, 42.5],
];

const THEME_COLORS = {
  night: {
    text: "#f1f5f9",
    halo: "#0f172a",
    stroke: "#ffffff",
    accent: "#7dd3fc",   // sky-300
    skipped: "#94a3b8",  // slate-400
    // Badge plate: near-opaque so dates stay legible over any basemap detail.
    plate: "#0f172af2",  // slate-900 @ 95%
    plateBorder: "#475569",
    plateText: "#e2e8f0",
    plateSubText: "#cbd5e1",
  },
  day: {
    text: "#1e293b",
    halo: "#f8fafc",
    stroke: "#0f172a",
    accent: "#0284c7",   // sky-600
    skipped: "#64748b",
    plate: "#fffffff2",
    plateBorder: "#94a3b8",
    plateText: "#0f172a",
    plateSubText: "#334155",
  },
} as const;

function legColorForTheme(exertion: number, theme: MapTheme): string {
  if (theme === "night") {
    const hue = Math.round(140 * (1 - exertion)); // green → red
    return `hsl(${hue}, 100%, 65%)`;
  }
  // Day: teal (170°) → red (0°). Teal-to-red reads as easy→hard and is clearly
  // distinct from the olive/forest greens on the outdoors basemap.
  const hue = Math.round(170 * (1 - exertion));
  return `hsl(${hue}, 85%, 32%)`;
}

type Props = {
  legs: Leg[];
  stops: SnapshotStop[];
  /** Stop id → stay span of the nights slept there, e.g. "15. → 16. 8.". */
  dateRanges: Record<string, string>;
  /** Leg index → day badge drawn along that leg ("Dnes" / "Zítra" / "17. 8.").
   *  Only one leg per travel-day segment carries a label. */
  legDayLabels?: Record<number, string>;
  hoveredLegIndex: number | null;
  onHoverLeg: (index: number | null) => void;
  /** Set of leg indices highlighted from the Dny tab (may span multiple legs). */
  hoveredDayLegs?: Set<number> | null;
  onSetStopNights: (id: string, nights: number) => void;
  onToggleStopSkip: (id: string) => void;
  distanceUnit: DistanceUnit;
  mapTheme: MapTheme;
  /** When on, clicking empty map fires onMapClick (pin-drop mode). */
  pinDropMode: boolean;
  onMapClick: (lngLat: { lng: number; lat: number }) => void;
  /** Where to center the very first view, e.g. today's leg mid-trip — instead
   *  of fitting the whole route. Ignored on later stop/leg updates. */
  focusPoint?: { lat: number; lng: number } | null;
  /** "Where we are right now" marker — a real GPS fix (carIsLive) or a
   *  time-of-day estimate along today's leg. Null hides the marker. */
  carPosition?: { lat: number; lng: number } | null;
  carIsLive?: boolean;
};

function routeGeoJSON(
  legs: Leg[],
  theme: MapTheme,
  dayLabels: Record<number, string> = {},
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: legs.map((leg) => ({
      type: "Feature",
      id: leg.index,
      properties: {
        index: leg.index,
        color: legColorForTheme(leg.exertion, theme),
        km: leg.km,
        hours: leg.hours,
        dayLabel: dayLabels[leg.index] ?? "",
      },
      geometry: {
        type: "LineString",
        coordinates: leg.geometry,
      },
    })),
  };
}

/** Second label line: the night date range (overnight) or a pass-through hint.
 *  The moon icon on the circle already signals "we sleep here", so the nights
 *  count word is omitted — the date range conveys the span. */
function stopSubLabel(stop: SnapshotStop, range: string | undefined): string {
  if (stop.status === "SKIPPED") return "";
  if (stop.nights > 0) return range ?? "";
  return t.map.passthrough;
}

/** A crescent-moon icon (dark slate, drawn on a canvas) registered with the map
 *  and shown centered on overnight stops. Dark reads well on both the light
 *  (night-theme) and medium (day-theme) blue accent circles. */
function moonImageData(): { width: number; height: number; data: Uint8ClampedArray } {
  const size = 36;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(size * 0.46, size / 2, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Carve a crescent by erasing an offset disc.
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(size * 0.62, size * 0.4, size * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  const img = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: img.data };
}

// A stretchable rounded-rect "plate" (a nine-patch icon) that sits behind the
// date labels via `icon-text-fit`, so they read as badges on the map instead of
// bare text fighting the basemap. Sized in device pixels; pixelRatio 2 means the
// unstretched plate is 24 CSS px and only the middle band stretches.
const PLATE_PX = 48;
const PLATE_RADIUS = 10;

/** Zoom at which labels switch from compact (dates only) to full (name + dates).
 *  The whole-route overview lands just under z6, so it stays uncluttered while
 *  a single zoom step brings the names back. */
const LABEL_DETAIL_ZOOM = 6;

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  // arcTo rather than roundRect — the latter is still too new to rely on.
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function plateImageData(
  fill: string,
  stroke: string,
): { width: number; height: number; data: Uint8ClampedArray } {
  const canvas = document.createElement("canvas");
  canvas.width = PLATE_PX;
  canvas.height = PLATE_PX;
  const ctx = canvas.getContext("2d")!;
  roundedRectPath(ctx, 1, 1, PLATE_PX - 2, PLATE_PX - 2, PLATE_RADIUS);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  const img = ctx.getImageData(0, 0, PLATE_PX, PLATE_PX);
  return { width: PLATE_PX, height: PLATE_PX, data: img.data };
}

/** Nine-patch metadata: only the middle band stretches, text sits in `content`.
 *  Typed off addImage since mapbox-gl doesn't export StyleImageMetadata. */
type ImageMetadata = Parameters<mapboxgl.Map["addImage"]>[2];

function plateOptions(): ImageMetadata {
  const band: [number, number] = [
    PLATE_RADIUS + 2,
    PLATE_PX - PLATE_RADIUS - 2,
  ];
  return {
    pixelRatio: 2,
    stretchX: [band],
    stretchY: [band],
    content: [4, 4, PLATE_PX - 4, PLATE_PX - 4],
  };
}

/**
 * Day badges as their own points, sitting at the middle of the labelled leg.
 * They used to ride the line (`symbol-placement: line-center`), but Mapbox drops
 * a line-placed symbol when the leg is shorter on screen than the badge — which
 * silently lost most travel days at overview zoom.
 */
function dayBadgeGeoJSON(
  legs: Leg[],
  theme: MapTheme,
  dayLabels: Record<number, string> = {},
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const leg of legs) {
    const label = dayLabels[leg.index];
    if (!label) continue;
    const coords = leg.geometry;
    if (coords.length === 0) continue;

    // Walk the polyline to its halfway point so the badge lands on the road,
    // not on the straight line between endpoints.
    let total = 0;
    for (let i = 1; i < coords.length; i++) total += segLength(coords[i - 1], coords[i]);
    let travelled = 0;
    let at = coords[Math.floor(coords.length / 2)];
    for (let i = 1; i < coords.length; i++) {
      travelled += segLength(coords[i - 1], coords[i]);
      if (travelled >= total / 2) {
        at = coords[i];
        break;
      }
    }

    features.push({
      type: "Feature",
      id: leg.index,
      properties: {
        dayLabel: label,
        color: legColorForTheme(leg.exertion, theme),
      },
      geometry: { type: "Point", coordinates: at },
    });
  }
  return { type: "FeatureCollection", features };
}

function segLength(a: [number, number], b: [number, number]): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function stopsGeoJSON(
  stops: SnapshotStop[],
  dateRanges: Record<string, string>,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stops.map((s, i) => ({
      type: "Feature",
      id: i,
      properties: {
        label: s.shortName ?? s.name,
        subLabel: stopSubLabel(s, dateRanges[s.id]),
        nights: s.nights,
        booked: s.bookedNights > 0 ? 1 : 0,
        skipped: s.status === "SKIPPED" ? 1 : 0,
      },
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
    })),
  };
}

const PANEL_PAD = 520;

function fitToStops(map: mapboxgl.Map, stops: SnapshotStop[]) {
  if (stops.length === 0) {
    map.fitBounds(WEST_COAST_BOUNDS, {
      padding: { top: 48, bottom: 48, left: 48, right: PANEL_PAD },
      duration: 0,
    });
    return;
  }
  const bounds = new mapboxgl.LngLatBounds();
  for (const s of stops) bounds.extend([s.lng, s.lat]);
  map.fitBounds(bounds, {
    padding: { top: 80, bottom: 80, left: 80, right: PANEL_PAD },
    maxZoom: 9,
    duration: 0,
  });
}

export default function MapView({
  legs,
  stops,
  dateRanges,
  legDayLabels,
  hoveredLegIndex,
  onHoverLeg,
  hoveredDayLegs,
  onSetStopNights,
  onToggleStopSkip,
  distanceUnit,
  mapTheme,
  pinDropMode,
  onMapClick,
  focusPoint,
  carPosition,
  carIsLive,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const carMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const focusPointRef = useRef(focusPoint);
  focusPointRef.current = focusPoint;
  // Only the very first fit after load should honour focusPoint; later stop
  // edits go back to fitting the whole route, as before.
  const initialFitDoneRef = useRef(false);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const stopPopupRef = useRef<mapboxgl.Popup | null>(null);
  // Tracks whether sources + layers are ready for the current style.
  const [layersReady, setLayersReady] = useState(false);

  const legsRef = useRef(legs);
  const stopsRef = useRef(stops);
  const dateRangesRef = useRef(dateRanges);
  const dayLabelsRef = useRef(legDayLabels);
  const unitRef = useRef(distanceUnit);
  const onHoverRef = useRef(onHoverLeg);
  const onSetNightsRef = useRef(onSetStopNights);
  const onToggleSkipRef = useRef(onToggleStopSkip);
  const onMapClickRef = useRef(onMapClick);
  const pinDropRef = useRef(pinDropMode);
  const mapThemeRef = useRef(mapTheme);
  const hoveredRef = useRef<number | null>(null);
  // Tracks which legs are currently highlighted from the Dny tab.
  const hoveredDayLegsRef = useRef<Set<number> | null>(null);
  // Index of the stop whose edit popup is open (null = none).
  const openStopRef = useRef<number | null>(null);
  legsRef.current = legs;
  stopsRef.current = stops;
  dateRangesRef.current = dateRanges;
  dayLabelsRef.current = legDayLabels;
  unitRef.current = distanceUnit;
  onHoverRef.current = onHoverLeg;
  onSetNightsRef.current = onSetStopNights;
  onToggleSkipRef.current = onToggleStopSkip;
  onMapClickRef.current = onMapClick;
  pinDropRef.current = pinDropMode;
  mapThemeRef.current = mapTheme;

  // Adds sources + layers for the current style. Called both on initial load
  // and whenever the style is swapped (style.load fires in both cases).
  function initLayers(map: mapboxgl.Map, theme: MapTheme) {
    const colors = THEME_COLORS[theme];

    // Read live data from refs: this runs from the once-registered style.load
    // handler, so on a later style swap it must re-add the *current* route/stops,
    // not the stale values captured when the handler was first bound.
    map.addSource("route", {
      type: "geojson",
      data: routeGeoJSON(legsRef.current, theme, dayLabelsRef.current),
    });
    map.addSource("stops", {
      type: "geojson",
      data: stopsGeoJSON(stopsRef.current, dateRangesRef.current),
    });
    map.addSource("day-badges", {
      type: "geojson",
      data: dayBadgeGeoJSON(legsRef.current, theme, dayLabelsRef.current),
    });

    // Casing drawn first (below route-line) so routes pop against any basemap.
    map.addLayer({
      id: "route-casing",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": theme === "night" ? "#0f172a" : "#ffffff",
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          11,
          6,
        ],
        "line-opacity": theme === "night" ? 0.55 : 0.8,
      },
    });

    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          7,
          3.5,
        ],
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          1,
          0.85,
        ],
      },
    });

    map.addLayer({
      id: "stops-circle",
      type: "circle",
      source: "stops",
      paint: {
        // Overnight stops grow with nights (capped); pass-throughs/skipped stay small.
        "circle-radius": [
          "case",
          ["==", ["get", "skipped"], 1],
          4,
          ["==", ["get", "nights"], 0],
          4.5,
          ["+", 6, ["min", ["*", ["get", "nights"], 1.6], 8]],
        ],
        "circle-color": [
          "case",
          ["==", ["get", "skipped"], 1],
          colors.skipped,
          ["==", ["get", "booked"], 1],
          "#f59e0b",  // amber = pre-booked nights
          colors.accent,
        ],
        // Pass-throughs read as dimmer/hollow vs. solid overnight bases.
        "circle-opacity": [
          "case",
          ["==", ["get", "nights"], 0],
          0.5,
          1,
        ],
        "circle-stroke-width": [
          "case",
          ["==", ["get", "nights"], 0],
          1.5,
          2,
        ],
        "circle-stroke-color": colors.stroke,
      },
    });

    // Moon icon centered on overnight (non-skipped) stops — the "we sleep here"
    // marker. Image is cleared on style swap, so (re)register it each style.load.
    if (!map.hasImage("moon")) {
      map.addImage("moon", moonImageData(), { pixelRatio: 2 });
    }
    map.addLayer({
      id: "stops-night-icon",
      type: "symbol",
      source: "stops",
      filter: [
        "all",
        [">", ["get", "nights"], 0],
        ["==", ["get", "skipped"], 0],
      ],
      layout: {
        "icon-image": "moon",
        "icon-size": 0.85,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });

    // The badge plate, re-registered every style.load (setStyle clears images)
    // and re-drawn per theme, so a night→day swap repaints it.
    if (map.hasImage("plate")) map.removeImage("plate");
    map.addImage(
      "plate",
      plateImageData(colors.plate, colors.plateBorder),
      plateOptions(),
    );

    // Our labels go on top of the whole style, not underneath the basemap's:
    // the cards and day badges are drawn unconditionally (allow-overlap), so
    // placement order buys nothing, while draw order decides who paints over
    // whom — and a city name printed across a date badge is exactly what this
    // is meant to avoid.

    // Overnight stops get a proper card on the plate. Zoomed out, the whole
    // route is on screen and a dozen full cards would collide into mush, so
    // only the dates show — the moon circle already says which stop they belong
    // to; zoomed in there's room for the name too.
    //
    // This is two layers with zoom ranges rather than one zoom-stepped
    // `text-field`: text-field is a layout property, re-evaluated per tile at
    // integer zooms, so a stepped one leaves neighbouring tiles disagreeing
    // about whether to show names. Layer min/maxzoom switches cleanly.
    const cardLayer = (
      id: string,
      textField: unknown,
      zoom: { minzoom?: number; maxzoom?: number },
    ) =>
      map.addLayer(
        {
          id,
          type: "symbol",
          source: "stops",
          ...zoom,
          filter: [
            "all",
            [">", ["get", "nights"], 0],
            ["==", ["get", "skipped"], 0],
          ],
          layout: {
            "icon-image": "plate",
            "icon-text-fit": "both",
            "icon-text-fit-padding": [3, 6, 3, 6],
            "text-field": textField,
            "text-size": 10,
            "text-line-height": 1.25,
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
            // Always drawn: the dates are the point of the exercise, and the
            // basemap's labels get placed before ours whatever the layer order,
            // so leaving this to collision silently drops most nights.
            "icon-allow-overlap": true,
            "text-allow-overlap": true,
            // Fixed anchor on purpose: text-variable-anchor re-runs placement on
            // every camera move and, combined with allow-overlap, intermittently
            // dropped every card after a pan/zoom.
            "text-offset": [0, 0.85],
            "text-anchor": "top",
          },
          paint: {
            "text-color": colors.plateText,
          },
        } as mapboxgl.LayerSpecification,
      );

    cardLayer("stops-label-card-compact", ["get", "subLabel"], {
      maxzoom: LABEL_DETAIL_ZOOM,
    });
    cardLayer(
      "stops-label-card",
      [
        "format",
        ["get", "label"],
        {},
        "\n",
        {},
        ["get", "subLabel"],
        { "font-scale": 0.9, "text-color": colors.plateSubText },
      ],
      { minzoom: LABEL_DETAIL_ZOOM },
    );

    // Day badge at the middle of each travel-day segment: which day it is
    // driven ("Dnes" / "Zítra" / "17. 8."), on the same plate so it reads over
    // the basemap. One badge per nocleh→nocleh day.
    map.addLayer({
      id: "route-day-label",
      type: "symbol",
      source: "day-badges",
      layout: {
        "icon-image": "plate",
        "icon-text-fit": "both",
        "icon-text-fit-padding": [2, 5, 2, 5],
        "text-field": ["get", "dayLabel"],
        "text-size": 9,
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
        "text-padding": 3,
        "icon-allow-overlap": true,
        "text-allow-overlap": true,
      },
      paint: {
        // Tinted by the segment's own exhaustion colour, like the line itself.
        "text-color": ["get", "color"],
      },
    });

    // Pass-throughs and skipped stops stay deliberately recessive: plain haloed
    // text, no plate, so the cards above carry the visual weight.
    map.addLayer({
      id: "stops-label-plain",
      type: "symbol",
      source: "stops",
      filter: [
        "any",
        ["==", ["get", "nights"], 0],
        ["==", ["get", "skipped"], 1],
      ],
      layout: {
        // Name only — "Průjezd" would just add noise next to a dozen date
        // badges, and the small hollow circle already reads as a pass-through
        // (the popup and the Trasa timeline spell it out).
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
      },
      paint: {
        "text-color": colors.text,
        "text-opacity": 0.85,
        "text-halo-color": colors.halo,
        "text-halo-width": 2,
        "text-halo-blur": 0.5,
      },
    });
  }

  // Build the interactive stop card (imperative DOM, like legPopupHTML but with
  // wired controls). Reads live data from refs so it reflects the current draft.
  function buildStopPopupNode(index: number): HTMLElement | null {
    const stop = stopsRef.current[index];
    if (!stop) return null;
    const isSkipped = stop.status === "SKIPPED";
    const range = dateRangesRef.current[stop.id];

    const node = document.createElement("div");
    node.className = "stop-popup__body";

    const title = document.createElement("div");
    title.className = "stop-popup__title";
    title.textContent = stop.shortName ?? stop.name;
    node.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "stop-popup__meta";
    meta.textContent = isSkipped
      ? t.status.SKIPPED
      : stop.nights > 0
        ? `${t.units.nights(stop.nights)}${range ? ` · ${range}` : ""}`
        : t.map.passthrough;
    node.appendChild(meta);

    if (!isSkipped) {
      const controls = document.createElement("div");
      controls.className = "stop-popup__controls";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "stop-popup__btn";
      minus.textContent = "−";
      minus.title = t.stop.removeNight;
      minus.disabled = stop.nights <= stop.bookedNights;
      minus.onclick = () =>
        onSetNightsRef.current(stop.id, Math.max(0, stop.nights - 1));

      const count = document.createElement("span");
      count.className = "stop-popup__count";
      count.textContent = stop.bookedNights > 0 ? `🔒 ${stop.nights}` : `🌙 ${stop.nights}`;

      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "stop-popup__btn";
      plus.textContent = "+";
      plus.title = t.stop.addNight;
      plus.onclick = () => onSetNightsRef.current(stop.id, stop.nights + 1);

      controls.append(minus, count, plus);
      node.appendChild(controls);
    }

    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "stop-popup__skip";
    skip.textContent = isSkipped ? t.stop.restore : t.stop.skip;
    skip.onclick = () => onToggleSkipRef.current(stop.id);
    node.appendChild(skip);

    return node;
  }

  // Open (or refresh) the stop editor popup for a given stop index.
  function openStopPopup(map: mapboxgl.Map, index: number) {
    const stop = stopsRef.current[index];
    const popup = stopPopupRef.current;
    const content = buildStopPopupNode(index);
    if (!stop || !popup || !content) return;
    openStopRef.current = index;
    popup.setLngLat([stop.lng, stop.lat]).setDOMContent(content).addTo(map);
  }

  // Init the map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLE_URL[mapThemeRef.current],
      bounds: WEST_COAST_BOUNDS,
      fitBoundsOptions: { padding: { top: 48, bottom: 48, left: 48, right: PANEL_PAD } },
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    // The container can still be settling (mobile browser chrome show/hide,
    // the header/panel transition, orientation change) after the map is
    // constructed; a stale canvas size skews fitBounds/jumpTo's centering,
    // which is what made the map appear to open somewhere off the west coast.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "leg-popup",
      offset: 12,
    });
    popupRef.current = popup;

    // Separate popup for the click-to-edit stop card (nights −/+ and skip).
    const stopPopup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      className: "stop-popup",
      offset: 14,
      maxWidth: "260px",
    });
    stopPopup.on("close", () => {
      openStopRef.current = null;
    });
    stopPopupRef.current = stopPopup;

    // Pin-drop: a click on empty map (not on a stop) adds a point there.
    // Registered once (not in style.load, which re-fires on every theme swap).
    map.on("click", (e) => {
      if (!pinDropRef.current) return;
      if (!map.getLayer("stops-circle")) return;
      const hit = map.queryRenderedFeatures(e.point, {
        layers: ["stops-circle"],
      });
      if (hit.length > 0) return; // tapping a stop edits it, doesn't add
      onMapClickRef.current(e.lngLat);
    });

    // style.load fires on initial load AND after every setStyle() call.
    map.on("style.load", () => {
      hoveredRef.current = null;
      setLayersReady(false);
      initLayers(map, mapThemeRef.current);

      // Re-bind hover events (removed when style swaps).
      map.on("mousemove", "route-line", (e) => {
        const f = e.features?.[0];
        if (!f || f.id == null) return;
        const index = Number(f.id);
        if (hoveredRef.current !== index) {
          setHover(map, hoveredRef.current, false);
          setHover(map, index, true);
          hoveredRef.current = index;
          onHoverRef.current(index);
        }
        map.getCanvas().style.cursor = "pointer";
        const leg = legsRef.current[index];
        if (leg && popupRef.current) {
          popupRef.current
            .setLngLat(e.lngLat)
            .setHTML(legPopupHTML(leg, unitRef.current))
            .addTo(map);
        }
      });

      map.on("mouseleave", "route-line", () => {
        map.getCanvas().style.cursor = "";
        setHover(map, hoveredRef.current, false);
        hoveredRef.current = null;
        onHoverRef.current(null);
        popupRef.current?.remove();
      });

      // Click a stop to open its night editor; pointer cursor on hover.
      map.on("mouseenter", "stops-circle", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "stops-circle", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", "stops-circle", (e) => {
        const f = e.features?.[0];
        if (!f || f.id == null) return;
        openStopPopup(map, Number(f.id));
      });

      setLayersReady(true);
    });

    return () => {
      resizeObserver.disconnect();
      popup.remove();
      stopPopup.remove();
      carMarkerRef.current?.remove();
      carMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      setLayersReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push data whenever legs / stops / date ranges change (and layers are ready).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReady) return;
    (map.getSource("route") as mapboxgl.GeoJSONSource | undefined)?.setData(
      routeGeoJSON(legs, mapThemeRef.current, legDayLabels),
    );
    (map.getSource("day-badges") as mapboxgl.GeoJSONSource | undefined)?.setData(
      dayBadgeGeoJSON(legs, mapThemeRef.current, legDayLabels),
    );
    (map.getSource("stops") as mapboxgl.GeoJSONSource | undefined)?.setData(
      stopsGeoJSON(stops, dateRanges),
    );
    if (!initialFitDoneRef.current && focusPointRef.current) {
      map.jumpTo({
        center: [focusPointRef.current.lng, focusPointRef.current.lat],
        zoom: 9,
      });
    } else {
      fitToStops(map, stops);
    }
    initialFitDoneRef.current = true;

    // Keep an open stop editor in sync after a −/+ or skip edit.
    if (openStopRef.current != null && stopPopupRef.current?.isOpen()) {
      const content = buildStopPopupNode(openStopRef.current);
      if (content) stopPopupRef.current.setDOMContent(content);
      else {
        stopPopupRef.current.remove();
        openStopRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs, stops, dateRanges, legDayLabels, layersReady]);

  // "Where we are" marker — a plain DOM marker (not a symbol layer) so it can
  // move continuously with a GPS fix without touching the style/sources.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!carPosition) {
      carMarkerRef.current?.remove();
      carMarkerRef.current = null;
      return;
    }
    if (!carMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "car-marker";
      el.textContent = "🚗";
      carMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([carPosition.lng, carPosition.lat])
        .addTo(map);
    } else {
      carMarkerRef.current.setLngLat([carPosition.lng, carPosition.lat]);
    }
    carMarkerRef.current
      .getElement()
      .classList.toggle("car-marker--live", !!carIsLive);
    carMarkerRef.current
      .getElement()
      .classList.toggle("car-marker--estimated", !carIsLive);
  }, [carPosition, carIsLive]);

  // Crosshair cursor while pin-drop mode is active.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = pinDropMode ? "crosshair" : "";
  }, [pinDropMode]);

  // Mirror externally-driven hover (e.g. hovering a row in the legs panel).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReady) return;
    if (hoveredRef.current === hoveredLegIndex) return;
    setHover(map, hoveredRef.current, false);
    setHover(map, hoveredLegIndex, true);
    hoveredRef.current = hoveredLegIndex;
  }, [hoveredLegIndex, layersReady]);

  // Highlight one or more legs from the Dny tab (day-hover).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReady) return;
    hoveredDayLegsRef.current?.forEach((i) => setHover(map, i, false));
    hoveredDayLegs?.forEach((i) => setHover(map, i, true));
    hoveredDayLegsRef.current = hoveredDayLegs ?? null;
  }, [hoveredDayLegs, layersReady]);

  // Swap style when theme changes; style.load handles re-adding layers.
  // Skip the first run: the map is already created with the current theme's
  // style, and calling setStyle() while that initial style is still loading
  // races with the constructor's style.load and drops the layers we just added
  // (the bug where routes only appeared after a manual night→day toggle).
  const styleMounted = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!styleMounted.current) {
      styleMounted.current = true;
      return;
    }
    popupRef.current?.remove();
    stopPopupRef.current?.remove();
    openStopRef.current = null;
    setLayersReady(false);
    map.setStyle(STYLE_URL[mapTheme]);
  }, [mapTheme]);

  if (!TOKEN) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-base-600 bg-base-800/50 p-8 text-center text-sm text-slate-400">
        {t.map.tokenMissing}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-base-700"
    />
  );
}

function setHover(map: mapboxgl.Map, index: number | null, hover: boolean) {
  if (index == null) return;
  try {
    map.setFeatureState({ source: "route", id: index }, { hover });
  } catch {
    // source not ready — ignore
  }
}

function legPopupHTML(leg: Leg, unit: DistanceUnit): string {
  const fromName = leg.from.shortName ?? leg.from.name;
  const toName = leg.to.shortName ?? leg.to.name;
  const route = t.map.leg(fromName, toName);
  const dist = formatDistance(leg.km, unit);
  const dur = t.units.duration(leg.hours);
  // ~ marks estimates that fell back to straight-line (no real road data yet).
  const approx = leg.fallback ? "~" : "";
  // The line's colour grades the whole nocleh→nocleh segment, so spell that
  // total out whenever this hop is only part of one.
  const segment =
    leg.segmentLegCount > 1
      ? `<div class="leg-popup__segment">${escapeHTML(t.map.segmentTotal)}: ${escapeHTML(
          formatDistance(leg.segmentKm, unit),
        )} · ${escapeHTML(t.units.duration(leg.segmentHours))}</div>`
      : "";
  return `
    <div class="leg-popup__body">
      <div class="leg-popup__route">${escapeHTML(route)}</div>
      <div class="leg-popup__meta">
        <span style="color:${leg.color}">${approx}${dist}</span>
        <span>· ${approx}${dur}</span>
      </div>
      ${segment}
    </div>`;
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
