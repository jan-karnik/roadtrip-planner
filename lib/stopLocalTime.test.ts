import { describe, expect, it } from "vitest";
import { localTimeZoneForStop } from "./stopLocalTime";

describe("localTimeZoneForStop", () => {
  it("uses Phoenix for most Arizona stops", () => {
    expect(
      localTimeZoneForStop({
        name: "Grand Canyon Village, Arizona, United States",
        lat: 36.05,
        lng: -112.14,
      }),
    ).toBe("America/Phoenix");
  });

  it("uses Denver for Utah and Navajo-area Page", () => {
    expect(
      localTimeZoneForStop({
        name: "Zion National Park, Utah, United States",
        lat: 37.2,
        lng: -112.9,
      }),
    ).toBe("America/Denver");
    expect(
      localTimeZoneForStop({
        name: "Page, Arizona, United States",
        lat: 36.9,
        lng: -111.5,
      }),
    ).toBe("America/Denver");
  });

  it("defaults to Pacific for California coast", () => {
    expect(
      localTimeZoneForStop({
        name: "San Francisco, California, United States",
        lat: 37.7,
        lng: -122.4,
      }),
    ).toBe("America/Los_Angeles");
  });
});
