import { describe, expect, it } from "vitest";
import {
  appleMapsDirectionsUrl,
  driveDirectionsEndpoints,
  googleMapsDirectionsUrl,
  stopDisplayLabel,
} from "./driveNav";

describe("driveDirectionsEndpoints", () => {
  const stops = [
    { label: "SFO", lat: 37.6, lng: -122.4 },
    { label: "Yosemite", lat: 37.7, lng: -119.5 },
  ];

  it("resolves origin and destination by schedule labels", () => {
    const end = driveDirectionsEndpoints(
      { km: 100, hours: 2, fromName: "SFO", legIndices: [0] },
      "Yosemite",
      stops,
    );
    expect(end).toEqual({
      origin: { lat: 37.6, lng: -122.4 },
      destination: { lat: 37.7, lng: -119.5 },
    });
  });

  it("returns null when a label is missing", () => {
    expect(
      driveDirectionsEndpoints(
        { km: 1, hours: 1, fromName: "Nowhere", legIndices: [0] },
        "Yosemite",
        stops,
      ),
    ).toBeNull();
  });
});

describe("directions URLs", () => {
  const a = { lat: 37.6, lng: -122.4 };
  const b = { lat: 36.1, lng: -115.2 };

  it("builds a Google Maps driving URL", () => {
    expect(googleMapsDirectionsUrl(a, b)).toBe(
      "https://www.google.com/maps/dir/?api=1&origin=37.6%2C-122.4&destination=36.1%2C-115.2&travelmode=driving",
    );
  });

  it("builds an Apple Maps driving URL", () => {
    expect(appleMapsDirectionsUrl(a, b)).toContain("maps.apple.com");
    expect(appleMapsDirectionsUrl(a, b)).toContain("dirflg=d");
  });
});

describe("stopDisplayLabel", () => {
  it("prefers shortName", () => {
    expect(stopDisplayLabel({ name: "Long", shortName: "Short" })).toBe("Short");
  });
});
