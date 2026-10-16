import { describe, expect, it } from "vitest";
import {
  SESSION_MAX_AGE_S,
  createSessionValue,
  verifySessionValue,
} from "./session";

const SECRET = "test-secret";
const NOW = Date.UTC(2026, 7, 14);

describe("session cookie", () => {
  it("accepts a fresh cookie signed with the same secret", async () => {
    const value = await createSessionValue(SECRET, NOW);
    expect(await verifySessionValue(value, SECRET, NOW + 1000)).toBe(true);
  });

  it("never contains the secret", async () => {
    const value = await createSessionValue(SECRET, NOW);
    expect(value).not.toContain(SECRET);
  });

  it("rejects a cookie after its expiry", async () => {
    const value = await createSessionValue(SECRET, NOW);
    const later = NOW + SESSION_MAX_AGE_S * 1000 + 1;
    expect(await verifySessionValue(value, SECRET, later)).toBe(false);
  });

  it("rejects a cookie signed with another secret (rotation logs out)", async () => {
    const value = await createSessionValue("old-secret", NOW);
    expect(await verifySessionValue(value, SECRET, NOW)).toBe(false);
  });

  it("rejects an extended expiry with the original signature", async () => {
    const value = await createSessionValue(SECRET, NOW);
    const [, sig] = value.split(".");
    const forged = `${NOW + SESSION_MAX_AGE_S * 2000}.${sig}`;
    expect(await verifySessionValue(forged, SECRET, NOW)).toBe(false);
  });

  it("rejects garbage, the bare secret and a missing secret", async () => {
    for (const v of [undefined, "", ".", "abc", "123.", "x.y", SECRET, "9999999999999.@@"]) {
      expect(await verifySessionValue(v, SECRET, NOW)).toBe(false);
    }
    const value = await createSessionValue(SECRET, NOW);
    expect(await verifySessionValue(value, null, NOW)).toBe(false);
  });
});
