"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Save, Check, RefreshCw } from "lucide-react";
import { saveOption, updateOption } from "@/app/actions/options";
import { t } from "@/lib/i18n";
import type { SnapshotStop } from "./types";

/**
 * Persists the current map draft as an ItineraryOption.
 *
 * Two modes:
 * - No optionId: "Save as new" only (live map / create page)
 * - With optionId: "Update #X" (disabled when clean) + "Save as new" side by side
 */
export function SaveOptionForm({
  tripId,
  stops,
  label,
  originalLabel,
  optionId,
  viewingSeq,
  dirty = false,
  saveBlockMessage = null,
  onPersisted,
}: {
  tripId: string;
  stops: SnapshotStop[];
  label: string;
  originalLabel?: string;
  optionId?: string;
  viewingSeq?: number;
  dirty?: boolean;
  saveBlockMessage?: string | null;
  /** Called after a successful save or in-place update so the planner can rebaseline. */
  onPersisted?: (payload: {
    label: string;
    stops: SnapshotStop[];
  }) => void;
}) {
  const [savePending, startSaveTransition] = useTransition();
  const [updatePending, startUpdateTransition] = useTransition();
  const [savedSeq, setSavedSeq] = useState<number | null>(null);
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCount = stops.filter((s) => s.status !== "SKIPPED").length;
  const labelDirty = label.trim() !== (originalLabel ?? "").trim();
  const blocked = !!saveBlockMessage;
  const canSave = activeCount >= 2 && !savePending && !updatePending && !blocked;
  const canUpdate = canSave && (dirty || labelDirty);

  const stopPayload = stops.map((s) => ({
    name: s.name,
    shortName: s.shortName,
    lat: s.lat,
    lng: s.lng,
    nights: s.nights,
    bookedNights: s.bookedNights,
    status: s.status,
    isHotel: s.isHotel,
    address: s.address,
    url: s.url,
    phone: s.phone,
  }));

  function onSaveNew() {
    setError(null);
    setSavedSeq(null);
    setUpdated(false);
    const persistedLabel = label.trim() || originalLabel?.trim() || "";
    const persistedStops = stops;
    startSaveTransition(async () => {
      const res = await saveOption({
        tripId,
        label: label.trim() || undefined,
        stops: stopPayload,
      });
      if (res.ok) {
        setSavedSeq(res.seq);
        onPersisted?.({ label: persistedLabel, stops: persistedStops });
      } else {
        setError(res.error);
      }
    });
  }

  function onUpdate() {
    if (!optionId || !viewingSeq) return;
    setError(null);
    setSavedSeq(null);
    setUpdated(false);
    const persistedLabel = label.trim() || originalLabel?.trim() || "";
    const persistedStops = stops;
    startUpdateTransition(async () => {
      const res = await updateOption({
        optionId,
        label: label.trim() || undefined,
        stops: stopPayload,
      });
      if (res.ok) {
        setUpdated(true);
        onPersisted?.({ label: persistedLabel, stops: persistedStops });
      } else {
        setError(res.error ?? t.options.updateError);
      }
    });
  }

  const isEditingVariant = !!optionId && viewingSeq != null;

  return (
    <div className="flex items-center gap-2">
      {isEditingVariant && (
        <button
          type="button"
          onClick={onUpdate}
          disabled={!canUpdate}
          title={t.options.updateVariant(viewingSeq!)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white/80 ring-1 ring-inset ring-white/20 transition hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw className="h-4 w-4" />
          {updatePending ? t.options.updating : t.options.updateVariant(viewingSeq!)}
        </button>
      )}

      <button
        type="button"
        onClick={onSaveNew}
        disabled={!canSave}
        title={isEditingVariant ? t.options.saveAsNew : t.options.saveAsOption}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent/20 px-3 py-1.5 text-sm font-medium text-accent ring-1 ring-inset ring-accent/40 transition hover:bg-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Save className="h-4 w-4" />
        {savePending
          ? t.options.saving
          : isEditingVariant
            ? t.options.saveAsNew
            : t.options.save}
      </button>

      {updated && viewingSeq != null && (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
          <Check className="h-3.5 w-3.5" />
          {t.options.updated(viewingSeq)}
        </span>
      )}

      {savedSeq != null && (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
          <Check className="h-3.5 w-3.5" />
          {t.options.saved(savedSeq)}{" "}
          <Link href="/options" className="underline hover:text-emerald-200">
            {t.nav.options}
          </Link>
        </span>
      )}

      {error && <span className="text-xs text-rose-300">{error}</span>}
      {!error && blocked && saveBlockMessage && (
        <span className="hidden text-xs text-rose-300 sm:inline">{saveBlockMessage}</span>
      )}
    </div>
  );
}
