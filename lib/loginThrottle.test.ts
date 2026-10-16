import { describe, expect, it } from "vitest";
import { clientKey, createLoginThrottle } from "./loginThrottle";

describe("createLoginThrottle", () => {
  it("blocks after the failure limit until the window ends", () => {
    const th = createLoginThrottle(3, 60_000);
    for (let i = 0; i < 3; i++) {
      expect(th.retryAfterMs("a", 1000)).toBe(0);
      th.recordFailure("a", 1000);
    }
    expect(th.retryAfterMs("a", 1000)).toBe(60_000);
    expect(th.retryAfterMs("a", 31_000)).toBe(30_000);
    expect(th.retryAfterMs("a", 61_000)).toBe(0);
  });

  it("tracks clients separately", () => {
    const th = createLoginThrottle(1, 60_000);
    th.recordFailure("a", 0);
    expect(th.retryAfterMs("a", 0)).toBeGreaterThan(0);
    expect(th.retryAfterMs("b", 0)).toBe(0);
  });

  it("reset clears a client's failures", () => {
    const th = createLoginThrottle(1, 60_000);
    th.recordFailure("a", 0);
    th.reset("a");
    expect(th.retryAfterMs("a", 0)).toBe(0);
  });
});

describe("clientKey", () => {
  it("uses the proxy-appended (last) X-Forwarded-For entry", () => {
    expect(clientKey("6.6.6.6, 203.0.113.7", null)).toBe("203.0.113.7");
    expect(clientKey("203.0.113.7", null)).toBe("203.0.113.7");
  });

  it("falls back to X-Real-IP, then one shared bucket", () => {
    expect(clientKey(null, "198.51.100.1")).toBe("198.51.100.1");
    expect(clientKey(null, null)).toBe("unknown");
  });
});
