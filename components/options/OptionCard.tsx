"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Trash2,
  Map as MapIcon,
  Moon,
} from "lucide-react";
import { DistanceDisplay } from "@/components/distance/DistanceDisplay";
import { StatusBadge } from "@/components/ui/Badge";
import { deleteOption } from "@/app/actions/options";
import { t } from "@/lib/i18n";
import { RoutePreview } from "./RoutePreview";
import type { OptionView } from "./types";

export function OptionCard({
  option,
  rank,
  tripNights,
}: {
  option: OptionView;
  rank: number;
  tripNights: number | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  const title = option.label ?? t.options.defaultLabel(option.seq);

  const fit = tripNights != null ? option.totalNights - tripNights : null;
  const fitTone =
    fit === 0
      ? "text-emerald-300 ring-emerald-500/30 bg-emerald-500/10"
      : fit != null && fit > 0
        ? "text-amber-300 ring-amber-500/30 bg-amber-500/10"
        : "text-rose-300 ring-rose-500/30 bg-rose-500/10";
  const fitLabel =
    fit === 0
      ? t.schedule.fitExact
      : fit != null && fit > 0
        ? t.schedule.fitOver(fit)
        : fit != null
          ? t.schedule.fitUnder(-fit)
          : "";

  function onDelete() {
    if (!window.confirm(t.options.confirmDelete)) return;
    startTransition(async () => {
      await deleteOption({ optionId: option.id });
      router.refresh();
    });
  }

  return (
    <li
      className={`rounded-xl border border-base-700 bg-base-800 p-4 transition ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-base-700 font-mono text-sm font-semibold text-slate-200">
          {rank}
        </span>

        <RoutePreview stops={option.stops} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500">
              #{option.seq}
            </span>
            <h3 className="truncate font-medium text-slate-100">{title}</h3>
          </div>

          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                {t.options.totalTime}
              </dt>
              <dd className="font-semibold text-slate-100">
                {t.units.duration(option.totalHours)}
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                {t.options.totalDistance}
              </dt>
              <dd className="font-semibold text-slate-100">
                <DistanceDisplay km={option.totalKm} />
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                {t.options.stops(option.stops.length)}
              </dt>
            </div>
            {tripNights != null && (
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${fitTone}`}
                  title={fitLabel}
                >
                  <Moon className="h-3 w-3" />
                  {t.schedule.nightsOf(option.totalNights, tripNights)}
                  {fit !== 0 ? ` · ${fitLabel}` : ""}
                </span>
              </div>
            )}
          </dl>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/?option=${option.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent ring-1 ring-inset ring-accent/30 transition hover:bg-accent/25"
            >
              <MapIcon className="h-3.5 w-3.5" />
              {t.options.loadOntoMap}
            </Link>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-base-600 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-base-700"
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {expanded ? t.options.collapse : t.options.expand}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-base-600 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.options.delete}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <ol className="mt-4 flex flex-col gap-1.5 border-t border-base-700 pt-3">
          {option.stops.map((stop, i) => {
            const isSkipped = stop.status === "SKIPPED";
            return (
              <li
                key={i}
                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                  isSkipped ? "opacity-60" : ""
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-base-700 font-mono text-[11px] text-slate-400">
                  {i + 1}
                </span>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-accent/70" />
                <span
                  className={`min-w-0 flex-1 truncate text-sm ${
                    isSkipped ? "text-slate-400 line-through" : "text-slate-100"
                  }`}
                  title={stop.name}
                >
                  {stop.shortName ?? stop.name}
                </span>
                {!isSkipped && stop.nights > 0 && (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-slate-400"
                    title={t.stop.nights}
                  >
                    <Moon className="h-3 w-3 text-slate-500" />
                    {stop.nights}
                  </span>
                )}
                <StatusBadge status={stop.status} label={t.status[stop.status]} />
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}
