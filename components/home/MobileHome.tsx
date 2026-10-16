"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ClipboardCopy,
  Map as MapIcon,
  Navigation,
  PlusCircle,
  Route,
} from "lucide-react";
import { civilNoon } from "@/lib/live";
import { formatCivilDateRange } from "@/lib/schedule";
import { ZONES } from "@/lib/timezones";
import { t } from "@/lib/i18n";

// The phone landing screen. The planner map is a desktop tool (drag-to-reorder,
// hover metrics, a 500px side panel); on a phone the one thing that matters is
// getting into "Na cestě" in a single thumb tap — so that's the whole screen,
// with the planning routes demoted to a tile grid below it.

const DAY_MS = 86_400_000;

export function MobileHome({
  tripName,
  tripStart,
  tripEnd,
  optionLabel,
}: {
  tripName: string;
  tripStart: string | null;
  tripEnd: string | null;
  optionLabel: string | null;
}) {
  // Resolved after mount only — a server-rendered date would bake the build
  // time into the HTML and mismatch on hydration (same rule as /live).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  const start = tripStart ? civilNoon(new Date(tripStart), ZONES.SFO.id) : null;
  const end = tripEnd ? civilNoon(new Date(tripEnd), ZONES.SFO.id) : null;
  const tripWindow = start && end ? formatCivilDateRange(start, end) : null;

  // "Where in the trip are we" — counted in the trip's zone, like everything else.
  let status: string | null = null;
  if (now && start && end) {
    const today = civilNoon(now, ZONES.SFO.id).getTime();
    const totalDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
    if (today < start.getTime()) {
      status = t.home.beforeTrip(
        Math.round((start.getTime() - today) / DAY_MS),
      );
    } else if (today > end.getTime()) {
      status = t.home.afterTrip;
    } else {
      status = t.home.duringTrip(
        Math.round((today - start.getTime()) / DAY_MS) + 1,
        totalDays,
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">{tripName}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-400">
          {tripWindow && (
            <span className="font-mono">{t.home.tripWindow(tripWindow, start!.getUTCFullYear())}</span>
          )}
          {status && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-accent">{status}</span>
            </>
          )}
        </p>
      </header>

      {/* The reason this screen exists. */}
      <Link
        href="/live"
        className="flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent/10 p-5 shadow-lg shadow-accent/5 transition active:bg-accent/20"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-base-900">
          <Navigation className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-white">
            {t.home.liveCta}
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-white/60">
            {t.home.liveCtaHint}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-accent" />
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Tile
          href="/?planner=1"
          icon={<MapIcon className="h-5 w-5" />}
          label={t.home.plannerCta}
          hint={optionLabel ?? t.home.plannerCtaHint}
        />
        <Tile
          href="/options"
          icon={<Route className="h-5 w-5" />}
          label={t.home.optionsCta}
          hint={t.home.optionsCtaHint}
        />
        <Tile
          href="/create"
          icon={<PlusCircle className="h-5 w-5" />}
          label={t.home.createCta}
          hint={t.home.createCtaHint}
        />
        <Tile
          href="/export"
          icon={<ClipboardCopy className="h-5 w-5" />}
          label={t.home.exportCta}
          hint={t.home.exportCtaHint}
        />
      </div>
    </div>
  );
}

function Tile({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-4 transition active:bg-white/10"
    >
      <span className="text-slate-300">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-white/40">
          {hint}
        </span>
      </span>
    </Link>
  );
}
