import { describe, expect, it } from "vitest";
import { diffOptions } from "./optionCompare";

describe("diffOptions", () => {
  const base = {
    label: "A",
    seq: 1,
    totalKm: 1000,
    totalHours: 20,
    totalNights: 17,
    stops: [
      { name: "SFO", nights: 0, status: "PLANNED" },
      { name: "Yosemite", nights: 2, status: "PLANNED" },
    ],
  };

  it("lists stops unique to each variant and metric deltas", () => {
    const other = {
      ...base,
      seq: 2,
      label: "B",
      totalKm: 1100,
      totalHours: 22,
      totalNights: 16,
      stops: [
        { name: "SFO", nights: 0, status: "PLANNED" },
        { name: "Zion", nights: 2, status: "PLANNED" },
      ],
    };
    const d = diffOptions(base, other);
    expect(d.onlyInA).toEqual(["Yosemite"]);
    expect(d.onlyInB).toEqual(["Zion"]);
    expect(d.deltaKm).toBe(100);
    expect(d.deltaHours).toBe(2);
    expect(d.deltaNights).toBe(-1);
  });
});
