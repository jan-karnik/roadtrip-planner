// In-memory brute-force guard for the shared login: after MAX_FAILURES wrong
// attempts from one client inside WINDOW_MS, further attempts are refused
// until the window ends. Per process — fine for the single-instance deploy;
// a restart clears it.

export const MAX_FAILURES = 5;
export const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED = 10_000;

type Entry = { failures: number; windowStart: number };

export function createLoginThrottle(
  maxFailures = MAX_FAILURES,
  windowMs = WINDOW_MS,
) {
  const entries = new Map<string, Entry>();

  function live(key: string, now: number): Entry | undefined {
    const e = entries.get(key);
    if (e && now - e.windowStart >= windowMs) {
      entries.delete(key);
      return undefined;
    }
    return e;
  }

  return {
    /** Milliseconds until `key` may try again; 0 when allowed. */
    retryAfterMs(key: string, now: number = Date.now()): number {
      const e = live(key, now);
      if (!e || e.failures < maxFailures) return 0;
      return e.windowStart + windowMs - now;
    },
    recordFailure(key: string, now: number = Date.now()): void {
      const e = live(key, now);
      if (e) {
        e.failures++;
        return;
      }
      // Bound memory under a spray of distinct keys: drop the oldest entry
      // (Map iteration order is insertion order).
      if (entries.size >= MAX_TRACKED) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      entries.set(key, { failures: 1, windowStart: now });
    },
    reset(key: string): void {
      entries.delete(key);
    },
  };
}

/**
 * The client address as seen by the nearest reverse proxy. Proxies append the
 * peer address to X-Forwarded-For, so the LAST entry is the one the proxy
 * wrote; earlier entries are client-supplied and spoofable. Caddy replaces the
 * header outright, which gives the same answer. Without a proxy every client
 * shares one bucket — still a brute-force cap, just a coarser one.
 */
export function clientKey(forwardedFor: string | null, realIp: string | null): string {
  const last = forwardedFor?.split(",").pop()?.trim();
  return last || realIp?.trim() || "unknown";
}
