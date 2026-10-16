"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Ban, RotateCcw, Minus, Plus, Moon, Trash2, Lock } from "lucide-react";
import { DistanceDisplay } from "@/components/distance/DistanceDisplay";
import { exertionLevel, type Leg } from "@/lib/legs";
import { t } from "@/lib/i18n";
import type { SnapshotStop } from "./types";

const ACCENT = "#38bdf8";
const SKIPPED_COLOR = "#64748b";

export function RouteTimeline({
  stops,
  legs,
  hoveredLegIndex,
  onHoverLeg,
  onReorder,
  onToggleSkip,
  onRemove,
  onSetNights,
  onInsertAt,
  insertIndex,
  dirty,
  onReset,
}: {
  stops: SnapshotStop[];
  legs: Leg[];
  hoveredLegIndex: number | null;
  onHoverLeg: (index: number | null) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleSkip: (id: string) => void;
  onRemove: (id: string) => void;
  onSetNights: (id: string, nights: number) => void;
  /** Arm an insert target at the given draft index (next add lands there). */
  onInsertAt: (index: number) => void;
  /** Currently-armed insert index (highlights its marker), or null. */
  insertIndex: number | null;
  dirty: boolean;
  onReset: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Map each draft position → active stop index (-1 if skipped).
  const activeIdxMap: number[] = [];
  let ai = 0;
  for (const stop of stops) {
    activeIdxMap.push(stop.status === "SKIPPED" ? -1 : ai++);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = stops.findIndex((s) => s.id === active.id);
    const toIndex = stops.findIndex((s) => s.id === over.id);
    if (fromIndex >= 0 && toIndex >= 0) {
      onReorder(fromIndex, toIndex);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
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

      {/* Sortable timeline */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stops.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col">
            {/* Leading insert (before the first stop) */}
            {stops.length > 0 && (
              <div className="flex pb-1 pl-[1px]">
                <div className="flex w-6 shrink-0 justify-center">
                  <InsertButton
                    active={insertIndex === 0}
                    onClick={() => onInsertAt(0)}
                  />
                </div>
              </div>
            )}
            {stops.map((stop, i) => {
              const isLast = i === stops.length - 1;
              const thisAI = activeIdxMap[i];
              const nextAI = isLast ? -1 : activeIdxMap[i + 1];
              const leg: Leg | null =
                !isLast && thisAI >= 0 && nextAI >= 0
                  ? (legs[thisAI] ?? null)
                  : null;

              return (
                <SortableStopRow
                  key={stop.id}
                  stop={stop}
                  i={i}
                  totalStops={stops.length}
                  leg={leg}
                  hoveredLegIndex={hoveredLegIndex}
                  activeIdx={thisAI}
                  onHoverLeg={onHoverLeg}
                  onToggleSkip={onToggleSkip}
                  onRemove={onRemove}
                  onSetNights={onSetNights}
                  onInsertAt={onInsertAt}
                  insertIndex={insertIndex}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableStopRow({
  stop,
  i,
  totalStops,
  leg,
  hoveredLegIndex,
  activeIdx,
  onHoverLeg,
  onToggleSkip,
  onRemove,
  onSetNights,
  onInsertAt,
  insertIndex,
}: {
  stop: SnapshotStop;
  i: number;
  totalStops: number;
  leg: Leg | null;
  hoveredLegIndex: number | null;
  activeIdx: number;
  onHoverLeg: (index: number | null) => void;
  onToggleSkip: (id: string) => void;
  onRemove: (id: string) => void;
  onSetNights: (id: string, nights: number) => void;
  onInsertAt: (index: number) => void;
  insertIndex: number | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const isSkipped = stop.status === "SKIPPED";
  const isLast = i === totalStops - 1;
  const connectorColor = leg?.color ?? SKIPPED_COLOR;
  const isHovered = leg !== null && hoveredLegIndex === activeIdx;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      className="flex"
    >
      {/* Gutter: dot + vertical line */}
      <div className="flex w-6 shrink-0 flex-col items-center">
        <div
          className="mt-3 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: isSkipped ? SKIPPED_COLOR : ACCENT }}
        />
        {!isLast && (
          <div className="relative mt-1 flex w-full flex-1 flex-col items-center">
            <div
              className="w-px flex-1 transition-opacity"
              style={{
                backgroundColor: connectorColor,
                opacity: isSkipped ? 0.25 : 0.55,
              }}
            />
            {/* Insert a stop into this gap (between stop i and i+1) */}
            <div className="absolute top-1/2 -translate-y-1/2">
              <InsertButton
                active={insertIndex === i + 1}
                onClick={() => onInsertAt(i + 1)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stop + leg content */}
      <div className="flex min-w-0 flex-1 flex-col pb-2 pl-2">
        {/* Stop row */}
        <div className={`flex items-center gap-1 ${isSkipped ? "opacity-60" : ""}`}>
          {/* Drag handle */}
          <button
            type="button"
            className="shrink-0 cursor-grab rounded p-1 text-white/25 transition hover:text-white/60 active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Přetažením přeřadit zastávku"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          {/* Name */}
          <span
            className={`min-w-0 flex-1 truncate text-sm font-medium leading-tight ${
              isSkipped ? "text-white/40 line-through" : "text-white"
            }`}
            title={stop.name}
          >
            {stop.shortName ?? stop.name}
          </span>

          {/* Nights counter (hidden when skipped) */}
          {!isSkipped && (
            <div className="flex shrink-0 items-center">
              <IconButton
                title={t.stop.removeNight}
                disabled={stop.nights <= Math.max(0, stop.bookedNights)}
                onClick={() => onSetNights(stop.id, stop.nights - 1)}
              >
                <Minus className="h-3 w-3" />
              </IconButton>
              <span
                className="inline-flex min-w-[2.25rem] items-center justify-center gap-0.5 font-mono text-xs"
                title={stop.bookedNights > 0 ? t.stop.bookedNights(stop.bookedNights) : undefined}
                style={{
                  color:
                    stop.nights === 0
                      ? "rgba(255,255,255,0.3)"
                      : stop.bookedNights > 0
                        ? "#f59e0b"
                        : "rgba(255,255,255,0.7)",
                }}
              >
                {stop.bookedNights > 0 ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Moon className="h-3 w-3" />
                )}
                {stop.nights}
              </span>
              <IconButton
                title={t.stop.addNight}
                onClick={() => onSetNights(stop.id, stop.nights + 1)}
              >
                <Plus className="h-3 w-3" />
              </IconButton>
            </div>
          )}

          {/* Skip + remove */}
          <div className="flex shrink-0 items-center">
            <IconButton
              title={isSkipped ? t.stop.restore : t.stop.skip}
              onClick={() => onToggleSkip(stop.id)}
            >
              {isSkipped ? (
                <RotateCcw className="h-3.5 w-3.5" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
            </IconButton>
            <IconButton title={t.stop.remove} onClick={() => onRemove(stop.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>

        {/* Passthrough label (0-night non-skipped) */}
        {!isSkipped && stop.nights === 0 && (
          <span className="mt-0.5 text-[10px] text-white/25">
            {t.map.passthrough}
          </span>
        )}

        {/* Leg connector row */}
        {!isLast && (
          <div
            onMouseEnter={() => leg && onHoverLeg(activeIdx)}
            onMouseLeave={() => onHoverLeg(null)}
            className={`mt-1 flex items-center gap-1.5 rounded px-1.5 py-1 text-xs transition ${
              isHovered ? "bg-white/10" : leg ? "hover:bg-white/5" : ""
            }`}
          >
            {leg ? (
              <>
                {/* Exhaustion reflects the whole nocleh→nocleh segment. */}
                <span style={{ color: leg.color }} className="shrink-0">
                  {t.map.exertion[exertionLevel(leg.segmentHours)]}
                </span>
                <span className="text-white/30">·</span>
                <span className="shrink-0 text-white/60">
                  <DistanceDisplay km={leg.km} />
                </span>
                <span className="text-white/30">·</span>
                <span className="shrink-0 text-white/50">
                  {t.units.duration(leg.hours)}
                </span>
                {leg.fallback && (
                  <span className="text-white/20" title={t.map.approx}>
                    ~
                  </span>
                )}
                {leg.segmentLegCount > 1 && (
                  <span
                    className="shrink-0 text-white/30"
                    title={t.map.segmentTotal}
                  >
                    ({t.map.segmentShort(t.units.duration(leg.segmentHours))})
                  </span>
                )}
              </>
            ) : (
              <span className="italic text-white/20">—</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Small "+" marker that arms an insert target for the gap it sits in. Faint by
// default, accent-highlighted when it's the active target.
function InsertButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={t.addStop.insertHere}
      className={`flex h-4 w-4 items-center justify-center rounded-full border bg-black transition ${
        active
          ? "border-accent text-accent opacity-100"
          : "border-white/25 text-white/40 opacity-50 hover:border-accent hover:text-accent hover:opacity-100"
      }`}
    >
      <Plus className="h-2.5 w-2.5" />
    </button>
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
      className="rounded p-1 text-white/40 transition hover:bg-white/10 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
