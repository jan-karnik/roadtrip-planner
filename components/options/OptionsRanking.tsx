"use client";

import { useMemo, useState } from "react";
import { Clock, Ruler } from "lucide-react";
import { t } from "@/lib/i18n";
import { OptionCard } from "./OptionCard";
import type { OptionView, SortKey } from "./types";

/**
 * Client wrapper that ranks the submitted options. Default sort is by total
 * driving time (shortest first); a toggle switches to total distance. Both
 * metrics are shown on every card regardless of the active sort.
 */
export function OptionsRanking({
  options,
  tripNights,
}: {
  options: OptionView[];
  tripNights: number | null;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("time");

  const sorted = useMemo(() => {
    const copy = [...options];
    copy.sort((a, b) =>
      sortKey === "time"
        ? a.totalHours - b.totalHours
        : a.totalKm - b.totalKm,
    );
    return copy;
  }, [options, sortKey]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">
          {t.options.sortBy}
        </span>
        <div className="inline-flex overflow-hidden rounded-md border border-base-600">
          <SortButton
            active={sortKey === "time"}
            onClick={() => setSortKey("time")}
          >
            <Clock className="h-3.5 w-3.5" />
            {t.options.sortByTime}
          </SortButton>
          <SortButton
            active={sortKey === "distance"}
            onClick={() => setSortKey("distance")}
          >
            <Ruler className="h-3.5 w-3.5" />
            {t.options.sortByDistance}
          </SortButton>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {sorted.map((option, i) => (
          <OptionCard
            key={option.id}
            option={option}
            rank={i + 1}
            tripNights={tripNights}
          />
        ))}
      </ol>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-base-700 text-slate-100"
          : "text-slate-400 hover:bg-base-800 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
