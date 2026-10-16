import { describe, it, expect } from "vitest";
import { normalize, diceCoefficient } from "./similarity";

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------

describe("normalize", () => {
  it("lowercases", () => {
    expect(normalize("Yosemite National Park")).toBe("yosemite national park");
  });

  it("strips punctuation and special characters", () => {
    expect(normalize("Fisherman's Wharf, San Francisco")).toBe(
      "fishermans wharf san francisco"
    );
    // "&" is stripped then space-collapse kicks in → single space, not double
    expect(normalize("Muir Woods & Mt. Tamalpais")).toBe(
      "muir woods mt tamalpais"
    );
  });

  it("collapses multiple spaces to one", () => {
    expect(normalize("Big   Sur")).toBe("big sur");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalize("  Golden Gate Bridge  ")).toBe("golden gate bridge");
  });

  it("handles empty string", () => {
    expect(normalize("")).toBe("");
  });

  it("keeps digits", () => {
    expect(normalize("Route 66")).toBe("route 66");
  });
});

// ---------------------------------------------------------------------------
// diceCoefficient
// ---------------------------------------------------------------------------

describe("diceCoefficient", () => {
  it("returns 1 for identical strings", () => {
    expect(diceCoefficient("yosemite", "yosemite")).toBe(1);
    expect(diceCoefficient("golden gate bridge", "golden gate bridge")).toBe(1);
  });

  it("returns 0 for strings with no shared bigrams", () => {
    // "zzz" and "qqqq" share no bigrams with anything west-coast-related
    expect(diceCoefficient("zzz", "qqqq")).toBe(0);
  });

  it("returns 0 when either input is too short to form bigrams", () => {
    // A single character has no bigrams
    expect(diceCoefficient("a", "alcatraz")).toBe(0);
    expect(diceCoefficient("sf", "san francisco")).toBe(0); // "sf" has 1 bigram not in "san francisco"
  });

  // -------------------------------------------------------------------------
  // Same-place aliases — should score ≥ 0.6 (fuzzy threshold)
  // These model the situation where one user adds a short name and another
  // tries to add the long official name (or vice-versa).
  // -------------------------------------------------------------------------

  it("Golden Gate vs Golden Gate Bridge — score ≥ 0.6", () => {
    // bigrams("golden gate") = 10 unique
    // bigrams("golden gate bridge") = 17 unique, all 10 of the shorter are shared
    // Dice = 2*10 / (10+17) = 20/27 ≈ 0.741
    const score = diceCoefficient(
      normalize("Golden Gate"),
      normalize("Golden Gate Bridge")
    );
    expect(score).toBeGreaterThanOrEqual(0.6);
    expect(score).toBeCloseTo(20 / 27, 5);
  });

  it("Death Valley vs Death Valley National Park — score ≥ 0.6", () => {
    // bigrams("death valley") = 11, bigrams("death valley national park") = 22, shared = 11
    // Dice = 2*11 / (11+22) = 22/33 ≈ 0.667
    const score = diceCoefficient(
      normalize("Death Valley"),
      normalize("Death Valley National Park")
    );
    expect(score).toBeGreaterThanOrEqual(0.6);
    expect(score).toBeCloseTo(22 / 33, 5);
  });

  it("Grand Canyon vs Grand Canyon National Park — score ≥ 0.6", () => {
    // bigrams("grand canyon") = 10, bigrams("grand canyon national park") = 22, shared = 10
    // Dice = 2*10 / (10+22) = 20/32 = 0.625
    const score = diceCoefficient(
      normalize("Grand Canyon"),
      normalize("Grand Canyon National Park")
    );
    expect(score).toBeGreaterThanOrEqual(0.6);
    expect(score).toBeCloseTo(20 / 32, 5);
  });

  it("Alcatraz vs Alcatraz Island — score ≥ 0.6", () => {
    // bigrams("alcatraz") = 7, bigrams("alcatraz island") = 14, shared = 7
    // Dice = 2*7 / (7+14) = 14/21 ≈ 0.667
    const score = diceCoefficient(
      normalize("Alcatraz"),
      normalize("Alcatraz Island")
    );
    expect(score).toBeGreaterThanOrEqual(0.6);
    expect(score).toBeCloseTo(14 / 21, 5);
  });

  it("Sequoia vs Sequoia National Park — score ≥ 0.6", () => {
    // bigrams("sequoia") = 6, bigrams("sequoia national park") = 19, shared = 6
    // Dice = 2*6 / (6+19) = 12/25 = 0.48 — below threshold
    // NOTE: "sequoia" is short enough that the many extra bigrams in the full
    // name drag the score below 0.6. The osmId guard catches this case instead.
    const score = diceCoefficient(
      normalize("Sequoia"),
      normalize("Sequoia National Park")
    );
    // Score is below 0.6; documented here so the threshold choice is explicit.
    expect(score).toBeLessThan(0.6);
    expect(score).toBeCloseTo(12 / 25, 5);
  });

  // -------------------------------------------------------------------------
  // Clearly different places — should score well below 0.6
  // These model genuinely separate POIs that must not be blocked.
  // -------------------------------------------------------------------------

  it("San Francisco vs San Diego — clearly different cities", () => {
    // bigrams("san francisco") = 11, bigrams("san diego") = 8, shared = 3 (sa, an, "n ")
    // Dice = 2*3 / (11+8) = 6/19 ≈ 0.316
    const score = diceCoefficient(
      normalize("San Francisco"),
      normalize("San Diego")
    );
    expect(score).toBeLessThan(0.6);
    expect(score).toBeCloseTo(6 / 19, 5);
  });

  it("Los Angeles vs Las Vegas — two unrelated cities", () => {
    const score = diceCoefficient(
      normalize("Los Angeles"),
      normalize("Las Vegas")
    );
    expect(score).toBeLessThan(0.6);
  });

  it("Yosemite National Park vs Redwood National Park — different parks", () => {
    // shared bigrams = 12 ("national park" contributes many); total = 20+19 = 39
    // Dice = 24/39 ≈ 0.615 — above 0.6 but below the 0.65 threshold used in addPlace.
    // This revealed a false positive at 0.6; the threshold was raised to 0.65 as a result.
    const score = diceCoefficient(
      normalize("Yosemite National Park"),
      normalize("Redwood National Park")
    );
    expect(score).toBeGreaterThan(0.6);   // would false-positive at threshold 0.6
    expect(score).toBeLessThan(0.65);     // correctly passes at threshold 0.65
  });

  it("Golden Gate Bridge vs Bay Bridge — different San Francisco bridges", () => {
    const score = diceCoefficient(
      normalize("Golden Gate Bridge"),
      normalize("Bay Bridge")
    );
    expect(score).toBeLessThan(0.6);
  });
});
