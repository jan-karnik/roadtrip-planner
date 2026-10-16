import { describe, it, expect } from "vitest";
import {
  draftDiffersFrom,
  mapDraftStorageKey,
  resolveDraftScope,
} from "./draftStorage";
import type { SnapshotStop } from "@/components/map/types";

function stop(id: string, nights = 1): SnapshotStop {
  return {
    id,
    name: `Stop ${id}`,
    shortName: null,
    lat: 37,
    lng: -122,
    nights,
    bookedNights: 0,
    status: "PLANNED",
    isHotel: false,
    address: null,
    url: null,
    phone: null,
  };
}

describe("resolveDraftScope", () => {
  it("uses option id when viewing a Variant", () => {
    expect(resolveDraftScope("opt-abc", 40)).toBe("opt-abc");
  });

  it("uses create for empty planner", () => {
    expect(resolveDraftScope(undefined, 0)).toBe("create");
  });

  it("uses seed when falling back to master stops", () => {
    expect(resolveDraftScope(undefined, 7)).toBe("seed");
  });
});

describe("mapDraftStorageKey", () => {
  it("includes trip and scope", () => {
    expect(mapDraftStorageKey("trip1", "opt-abc")).toBe(
      "rtp.mapDraft.v1.trip1.opt-abc",
    );
  });
});

describe("draftDiffersFrom", () => {
  it("detects reorder", () => {
    const a = [stop("1"), stop("2")];
    const b = [stop("2"), stop("1")];
    expect(draftDiffersFrom(b, a)).toBe(true);
  });

  it("detects added stop", () => {
    const baseline = [stop("1")];
    const draft = [stop("1"), stop("2")];
    expect(draftDiffersFrom(draft, baseline)).toBe(true);
  });

  it("is false when only names differ", () => {
    const baseline = [stop("1")];
    const draft = [{ ...stop("1"), name: "Renamed" }];
    expect(draftDiffersFrom(draft, baseline)).toBe(false);
  });
});
