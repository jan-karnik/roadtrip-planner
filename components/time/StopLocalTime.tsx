"use client";

import { formatStopLocalTime, type StopCoords } from "@/lib/stopLocalTime";
import { t } from "@/lib/i18n";

/** Local civil time at a stop on a given calendar instant (schedule night date). */
export function StopLocalTime({
  instant,
  stop,
  className = "",
}: {
  instant: Date;
  stop: StopCoords;
  className?: string;
}) {
  return (
    <span className={className} title={t.time.localAtStopHint}>
      {t.time.localAtStop(formatStopLocalTime(instant, stop))}
    </span>
  );
}
