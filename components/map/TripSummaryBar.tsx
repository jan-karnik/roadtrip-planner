"use client";

import { DistanceDisplay } from "@/components/distance/DistanceDisplay";
import { t } from "@/lib/i18n";
import { SaveOptionForm } from "./SaveOptionForm";
import type { SnapshotStop } from "./types";

function DeltaDistance({ km }: { km: number }) {
  const rounded = Math.round(km);
  if (rounded === 0) return null;
  const positive = rounded > 0;
  return (
    <span className={positive ? "text-rose-300" : "text-emerald-300"}>
      {positive ? "+" : "−"}
      <DistanceDisplay km={Math.abs(km)} />
    </span>
  );
}

function DeltaDuration({ hours }: { hours: number }) {
  const roundedMin = Math.round(hours * 60);
  if (roundedMin === 0) return null;
  const positive = roundedMin > 0;
  return (
    <span className={positive ? "text-rose-300" : "text-emerald-300"}>
      {positive ? "+" : "−"}
      {t.units.duration(Math.abs(hours))}
    </span>
  );
}

export function TripSummaryBar({
  tripId,
  stops,
  draftName,
  originalLabel,
  totalKm,
  totalHours,
  totalNights,
  tripNights,
  nightFit,
  deltaKm,
  deltaHours,
  dirty,
  loading,
  optionId,
  viewingSeq,
  saveBlockMessage,
  softPaceWarning,
  onDraftPersisted,
}: {
  tripId: string;
  stops: SnapshotStop[];
  draftName: string;
  originalLabel?: string;
  totalKm: number;
  totalHours: number;
  totalNights?: number;
  tripNights?: number;
  /** totalNights − tripNights from buildSchedule. */
  nightFit?: number;
  deltaKm: number;
  deltaHours: number;
  dirty: boolean;
  loading: boolean;
  optionId?: string;
  viewingSeq?: number;
  saveBlockMessage?: string | null;
  softPaceWarning?: string | null;
  onDraftPersisted?: (payload: {
    label: string;
    stops: SnapshotStop[];
  }) => void;
}) {
  const fitTone =
    nightFit === 0
      ? "text-emerald-300 ring-emerald-500/30 bg-emerald-500/10"
      : nightFit != null && nightFit > 0
        ? "text-amber-300 ring-amber-500/30 bg-amber-500/10"
        : nightFit != null
          ? "text-rose-300 ring-rose-500/30 bg-rose-500/10"
          : "";
  const fitLabel =
    nightFit === 0
      ? t.schedule.fitExact
      : nightFit != null && nightFit > 0
        ? t.schedule.fitOver(nightFit)
        : nightFit != null
          ? t.schedule.fitUnder(-nightFit)
          : "";

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex min-h-14 flex-col border-t border-white/10 bg-black/60 text-sm text-white/90 backdrop-blur-md">
      {(softPaceWarning || saveBlockMessage) && (
        <div className="flex flex-col gap-0.5 border-b border-white/10 px-5 py-1.5 text-xs">
          {softPaceWarning && (
            <span className="text-amber-200/90" title={softPaceWarning}>
              {softPaceWarning}
            </span>
          )}
          {saveBlockMessage && (
            <span className="text-rose-300" title={saveBlockMessage}>
              {saveBlockMessage}
            </span>
          )}
        </div>
      )}
      <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 sm:h-14 sm:flex-nowrap sm:py-0">
      <span className="flex items-center gap-1.5">
        <span className="text-white/50">↔</span>
        <span className="font-semibold">
          <DistanceDisplay km={totalKm} />
        </span>
      </span>

      <span className="flex items-center gap-1.5">
        <span className="text-white/50">⏱</span>
        <span className="font-semibold">{t.units.duration(totalHours)}</span>
        {totalNights != null && totalNights > 0 && (
          <span className="text-white/40 text-xs">
            ({t.units.duration(totalHours / totalNights)}/den)
          </span>
        )}
        {loading && (
          <span className="text-xs text-white/30">{t.map.loadingRoutes}</span>
        )}
      </span>

      {tripNights != null && totalNights != null && (
        <span
          className={`hidden rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset sm:inline ${fitTone}`}
          title={fitLabel}
        >
          {t.schedule.nightsOf(totalNights, tripNights)}
          {nightFit !== 0 && nightFit != null ? ` · ${fitLabel}` : ""}
        </span>
      )}

      {dirty && (
        <span className="flex items-center gap-1.5">
          <span className="text-white/50">Δ</span>
          <span className="flex items-center gap-2 font-semibold">
            <DeltaDistance km={deltaKm} />
            <DeltaDuration hours={deltaHours} />
          </span>
        </span>
      )}

      <div className="ml-auto">
        <SaveOptionForm
          tripId={tripId}
          stops={stops}
          label={draftName}
          originalLabel={originalLabel}
          optionId={optionId}
          viewingSeq={viewingSeq}
          dirty={dirty}
          saveBlockMessage={saveBlockMessage}
          onPersisted={onDraftPersisted}
        />
      </div>
      </div>
    </div>
  );
}
