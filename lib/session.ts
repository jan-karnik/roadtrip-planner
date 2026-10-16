// Shared-login session cookie, used by both middleware.ts (edge runtime) and
// app/actions/auth.ts (Node). Web Crypto only, so it runs in both.
//
// The cookie is `<expiresAtMs>.<HMAC-SHA256(secret, expiresAtMs)>`: the secret
// itself never leaves the server, and every cookie stops working at its own
// expiry no matter what the browser does with it. Rotating AUTH_SESSION_TOKEN
// revokes all cookies at once; there is no per-session revocation (that needs
// server-side session storage, which comes with real accounts).

export const SESSION_COOKIE = "rtp.auth";
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

// The dev fallback never applies in production: an unset AUTH_SESSION_TOKEN
// there means nobody gets in.
export function sessionSecret(): string | null {
  return (
    process.env.AUTH_SESSION_TOKEN ||
    (process.env.NODE_ENV === "production" ? null : "dev-session-token")
  );
}

const encoder = new TextEncoder();

function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function createSessionValue(
  secret: string,
  now: number = Date.now(),
): Promise<string> {
  const expiresAt = String(now + SESSION_MAX_AGE_S * 1000);
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret, "sign"),
    encoder.encode(expiresAt),
  );
  return `${expiresAt}.${toBase64Url(sig)}`;
}

export async function verifySessionValue(
  value: string | undefined,
  secret: string | null,
  now: number = Date.now(),
): Promise<boolean> {
  if (!value || !secret) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = value.slice(0, dot);
  if (!/^\d{1,15}$/.test(expiresAt) || Number(expiresAt) <= now) return false;
  const sig = fromBase64Url(value.slice(dot + 1));
  if (!sig) return false;
  // subtle.verify compares in constant time.
  return crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret, "verify"),
    sig,
    encoder.encode(expiresAt),
  );
}
