import type { StopStatus } from "@/lib/types";

const STATUS_STYLES: Record<StopStatus, string> = {
  PLANNED: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  VISITED: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  SKIPPED: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
};

export function StatusBadge({
  status,
  label,
}: {
  status: StopStatus;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  );
}
