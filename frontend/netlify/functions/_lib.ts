// Shared helpers for the payment functions. Files prefixed with "_" are not
// treated as deployable functions by Netlify. NOTE: these endpoints only ever
// see prices and order ids — never the user's backup, which stays in the browser.

import { getStore } from "@netlify/blobs";

export const PRICE = {
  // Stripe wants cents; PayPal wants dollar strings.
  siteCents: 1900,
  storeCents: 5900,
  siteUsd: "19.00",
  storeUsd: "59.00",
};

export function totalCents(store: boolean) {
  return PRICE.siteCents + (store ? PRICE.storeCents : 0);
}
export function totalUsd(store: boolean) {
  return (totalCents(store) / 100).toFixed(2);
}

export function json(statusCode: number, body: unknown, extraHeaders?: Record<string, string>) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export function parseBody(raw: string | null): Record<string, unknown> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// ---- Rate limiting (Netlify Blobs KV) ----
// Key: IP + product type. Stripe and PayPal share the same counter so switching
// payment methods doesn't reset the budget. Cart UI state is irrelevant — the
// server only sees the IP and the product flag.

const RL_WINDOW_MS = 60 * 60 * 1000; // 1 hour rolling window
const RL_MAX = 3;                     // attempts per IP per product per window

export type ProductType = "site" | "site+store";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // seconds until window resets, present when allowed=false
}

interface RlRecord {
  count: number;
  windowStart: number;
}

export async function checkRateLimit(
  ip: string,
  product: ProductType,
): Promise<RateLimitResult> {
  let store;
  try {
    store = getStore("rl");
  } catch {
    // Blobs unavailable (e.g. running outside netlify dev) — fail open so
    // local testing isn't blocked.
    return { allowed: true, remaining: RL_MAX - 1 };
  }

  const key = `${ip}:${product}`;
  const now = Date.now();
  let record: RlRecord | null = null;

  try {
    record = await store.get(key, { type: "json" }) as RlRecord | null;
  } catch {
    return { allowed: true, remaining: RL_MAX - 1 };
  }

  // New window or expired window — windowStart check on read handles expiry,
  // so no TTL needed; stale records are simply ignored when encountered.
  if (!record || now - record.windowStart >= RL_WINDOW_MS) {
    await store.setJSON(key, { count: 1, windowStart: now } satisfies RlRecord);
    return { allowed: true, remaining: RL_MAX - 1 };
  }

  // Within window, already at the limit
  if (record.count >= RL_MAX) {
    const retryAfter = Math.ceil((record.windowStart + RL_WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  // Within window, still has budget
  const next = record.count + 1;
  await store.setJSON(key, { count: next, windowStart: record.windowStart } satisfies RlRecord);
  return { allowed: true, remaining: RL_MAX - next };
}

export function getClientIp(headers: Record<string, string | undefined>): string {
  // cf-connecting-ip is set by Cloudflare and is the real client IP when
  // Cloudflare proxies traffic to Netlify. x-nf-client-connection-ip is the
  // Netlify equivalent (direct traffic, no Cloudflare). x-forwarded-for is the
  // last-resort fallback — take only the first entry to avoid spoofing.
  return (
    headers["cf-connecting-ip"] ??
    headers["x-nf-client-connection-ip"] ??
    ((headers["x-forwarded-for"] ?? "").split(",")[0].trim() || "unknown")
  );
}

// ---- PayPal REST ----
const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export function paypalBase() {
  return PAYPAL_BASE;
}

export async function paypalToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!id || !secret) throw new Error("PayPal not configured");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("PayPal auth failed");
  return data.access_token;
}
