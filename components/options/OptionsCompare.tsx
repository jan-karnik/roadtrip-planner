"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { DistanceDisplay } from "@/components/distance/DistanceDisplay";
import { diffOptions, type CompareOption } from "@/lib/optionCompare";
import { t } from "@/lib/i18n";
import type { OptionView } from "./types";

export function OptionsCompare({
  options,
  optionAId,
  optionBId,
  tripNights,
}: {
  options: OptionView[];
  optionAId: string | null;
  optionBId: string | null;
  tripNights: number | null;
}) {
  const a = options.find((o) => o.id === optionAId) ?? null;
  const b = options.find((o) => o.id === optionBId) ?? null;

  const toCompare = (o: OptionView): CompareOption => ({
    label: o.label ?? t.options.defaultLabel(o.seq),
    seq: o.seq,
    totalKm: o.totalKm,
    totalHours: o.totalHours,
    totalNights: o.totalNights,
    stops: o.stops,
  });

  const diff = useMemo(() => {
    if (!a || !b || a.id === b.id) return null;
    return diffOptions(toCompare(a), toCompare(b));
  }, [a, b]);

  return (
    <div className="flex flex-col gap-6">
      <form className="grid gap-4 sm:grid-cols-2">
        <VariantSelect
          label={t.options.compare.variantA}
          name="a"
          options={options}
          value={optionAId ?? ""}
        />
        <VariantSelect
          label={t.options.compare.variantB}
          name="b"
          options={options}
          value={optionBId ?? ""}
        />
      </form>

      {!a || !b ? (
        <p className="text-sm text-slate-500">{t.options.compare.pickTwo}</p>
      ) : a.id === b.id ? (
        <p className="text-sm text-amber-300">{t.options.compare.sameVariant}</p>
      ) : diff ? (
        <div className="flex flex-col gap-4 rounded-xl border border-base-700 bg-base-800 p-5">
          <h2 className="text-lg font-semibold text-slate-100">
            {t.options.compare.summary(a.label ?? `#${a.seq}`, b.label ?? `#${b.seq}`)}
          </h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <Metric
              label={t.options.totalDistance}
              value={<DistanceDisplay km={Math.abs(diff.deltaKm)} />}
              sign={diff.deltaKm}
              suffix={t.options.compare.vsB}
            />
            <Metric
              label={t.options.totalTime}
              value={t.units.duration(Math.abs(diff.deltaHours))}
              sign={diff.deltaHours}
              suffix={t.options.compare.vsB}
            />
            <Metric
              label={t.options.compare.nightsDelta}
              value={`${diff.deltaNights > 0 ? "+" : diff.deltaNights < 0 ? "−" : ""}${Math.abs(diff.deltaNights)}`}
              sign={diff.deltaNights}
              suffix={
                tripNights != null
                  ? t.schedule.nightsOf(b.totalNights, tripNights)
                  : undefined
              }
            />
          </dl>
          <div className="grid gap-4 sm:grid-cols-2">
            <StopList heading={t.options.compare.onlyInA} names={diff.onlyInA} />
            <StopList heading={t.options.compare.onlyInB} names={diff.onlyInB} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/?option=${a.id}`}
              className="rounded-lg bg-base-700 px-3 py-2 text-sm text-slate-200 hover:bg-base-600"
            >
              {t.options.compare.loadA}
            </Link>
            <Link
              href={`/?option=${b.id}`}
              className="rounded-lg bg-base-700 px-3 py-2 text-sm text-slate-200 hover:bg-base-600"
            >
              {t.options.compare.loadB}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VariantSelect({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: string;
  options: OptionView[];
  value: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <select
        name={name}
        defaultValue={value}
        onChange={(e) => {
          const url = new URL(window.location.href);
          url.searchParams.set(name, e.target.value);
          window.location.href = url.toString();
        }}
        className="rounded-lg border border-base-600 bg-base-900 px-3 py-2 text-sm text-slate-100"
      >
        <option value="">{t.options.compare.choose}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            #{o.seq} {o.label ?? t.options.defaultLabel(o.seq)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({
  label,
  value,
  sign,
  suffix,
}: {
  label: string;
  value: ReactNode;
  sign: number;
  suffix?: string;
}) {
  const tone =
    sign === 0
      ? "text-slate-300"
      : sign > 0
        ? "text-amber-300"
        : "text-emerald-300";
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold ${tone}`}>
        {sign !== 0 && (sign > 0 ? "+" : "−")}
        {value}
      </dd>
      {suffix && <dd className="text-xs text-slate-500">{suffix}</dd>}
    </div>
  );
}

function StopList({ heading, names }: { heading: string; names: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-slate-300">{heading}</h3>
      {names.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{t.options.compare.none}</p>
      ) : (
        <ul className="mt-2 list-inside list-disc text-sm text-slate-200">
          {names.map((n) => (
            <li key={n} className="truncate">
              {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
