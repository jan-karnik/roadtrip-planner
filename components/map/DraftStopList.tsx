"use client";

import {
  ChevronDown,
  ChevronUp,
  Ban,
  RotateCcw,
  MapPin,
  Minus,
  Plus,
  Moon,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { t } from "@/lib/i18n";
import type { SnapshotStop } from "./types";

/**
 * Draft itinerary list for the map sandbox. Operates purely on local state via
 * the supplied callbacks — it never calls a Server Action, so editing here does
 * NOT touch the DB or the master POI list (see app/page.tsx / MapPlanner).
 */
export function DraftStopList({
  stops,
  dirty,
  onReorder,
  onToggleSkip,
  onSetNights,
  onReset,
}: {
  stops: SnapshotStop[];
  dirty: boolean;
  onReorder: (index: number, direction: "up" | "down") => void;
  onToggleSkip: (id: string) => void;
  onSetNights: (id: string, nights: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30">
          {t.map.draftBadge}
        </span>
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/60 transition hover:bg-white/10 hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t.map.resetDraft}
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {stops.map((stop, i) => {
          const isSkipped = stop.status === "SKIPPED";
          return (
            <li
              key={stop.id}
              className={`flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 ${
                isSkipped ? "opacity-60" : ""
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-xs text-white/50">
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-accent/70" />
                  <span
                    className={`truncate text-sm font-medium ${
                      isSkipped ? "text-white/40 line-through" : "text-white"
                    }`}
                    title={stop.name}
                  >
                    {stop.shortName ?? stop.name}
                  </span>
                </div>
              </div>

              {!isSkipped && (
                <div
                  className="flex shrink-0 items-center gap-0.5"
                  title={t.stop.nights}
                >
                  <IconButton
                    title={t.stop.removeNight}
                    disabled={stop.nights <= 0}
                    onClick={() => onSetNights(stop.id, stop.nights - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </IconButton>
                  <span className="inline-flex min-w-[2.25rem] items-center justify-center gap-1 font-mono text-xs text-white/70">
                    <Moon className="h-3 w-3 text-slate-500" />
                    {stop.nights}
                  </span>
                  <IconButton
                    title={t.stop.addNight}
                    onClick={() => onSetNights(stop.id, stop.nights + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              )}

              <StatusBadge status={stop.status} label={t.status[stop.status]} />

              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  title={t.stop.moveUp}
                  disabled={i === 0}
                  onClick={() => onReorder(i, "up")}
                >
                  <ChevronUp className="h-4 w-4" />
                </IconButton>
                <IconButton
                  title={t.stop.moveDown}
                  disabled={i === stops.length - 1}
                  onClick={() => onReorder(i, "down")}
                >
                  <ChevronDown className="h-4 w-4" />
                </IconButton>
                <IconButton
                  title={isSkipped ? t.stop.restore : t.stop.skip}
                  onClick={() => onToggleSkip(stop.id)}
                >
                  {isSkipped ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
