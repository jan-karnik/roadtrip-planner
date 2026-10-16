// Pure side-by-side diff helpers for saved Variants.

export type CompareStop = {
  name: string;
  shortName?: string | null;
  nights: number;
  status: string;
};

export type CompareOption = {
  label: string;
  seq: number;
  totalKm: number;
  totalHours: number;
  totalNights: number;
  stops: CompareStop[];
};

export type OptionDiff = {
  onlyInA: string[];
  onlyInB: string[];
  deltaKm: number;
  deltaHours: number;
  deltaNights: number;
};

function activeLabels(stops: CompareStop[]): string[] {
  return stops
    .filter((s) => s.status !== "SKIPPED")
    .map((s) => s.shortName ?? s.name);
}

export function diffOptions(a: CompareOption, b: CompareOption): OptionDiff {
  const setA = new Set(activeLabels(a.stops));
  const setB = new Set(activeLabels(b.stops));
  const onlyInA = [...setA].filter((n) => !setB.has(n)).sort();
  const onlyInB = [...setB].filter((n) => !setA.has(n)).sort();
  return {
    onlyInA,
    onlyInB,
    deltaKm: b.totalKm - a.totalKm,
    deltaHours: b.totalHours - a.totalHours,
    deltaNights: b.totalNights - a.totalNights,
  };
}
