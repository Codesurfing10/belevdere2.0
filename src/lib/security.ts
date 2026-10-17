/**
 * Minimal signed-session + booking-ownership + rate-limit helpers.
 * Uses Web Crypto so it works in both the Edge middleware and Node route handlers.
 */
export const SESSION_COOKIE = 'bv_session';
export const BOOKING_COOKIE = 'bv_bk';

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.trim().length >= 16) return s.trim();
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set (16+ chars) in production');
  }
  return 'dev-only-insecure-session-secret';
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function sign(value: string): Promise<string> {
  return `${value}.${await hmac(value)}`;
}

/** Returns the original value if the token is validly signed, else null. */
export async function verify(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const value = token.slice(0, i);
  const sig = token.slice(i + 1);
  return safeEqual(sig, await hmac(value)) ? value : null;
}

export function newSessionId(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

type CookieReader = { cookies: { get(name: string): { value: string } | undefined } };

/** True if the request holds a signed booking cookie for this bookingId. */
export async function ownsBooking(req: CookieReader, bookingId: string): Promise<boolean> {
  const v = await verify(req.cookies.get(BOOKING_COOKIE)?.value);
  return !!v && v === bookingId;
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

// --- simple fixed-window in-memory rate limiter (per instance) ---
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    }
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function resetRateLimits() {
  buckets.clear();
}
