// Preview gating + client-side rate limiting (see docs/rate-limiting.md).
// The product is 100% in-browser, so these are enforced client-side. TRUE
// per-IP limits, account tiers and a shared server cache need a backend — see
// the note in the README / summary. This covers the anonymous free tier.

/** How many of each thing the FREE preview reveals. Full COUNTS are always
 * shown — we just don't render every item, so the value isn't given away. */
export const PREVIEW = {
  pages: 5,
  posts: 5,
  items: 5, // any other content type (jobs, lessons, events, …)
  images: 20,
  comments: 5,
} as const;

/** Anonymous free tier. Registered (10/day, 10GB) and paid (∞, 50GB) tiers
 * require accounts → a backend; not enforced here. */
export const FREE_TIER = {
  parsesPerDay: 3,
  maxBytes: 2 * 1024 ** 3, // 2 GB
};

const RL_KEY = "unpress_rl";
const CACHE_MS = 30 * 60 * 1000; // re-parsing the same file within 30 min is free

export interface RateCheck {
  allowed: boolean;
  remaining: number;
  cached: boolean;
  reason?: string;
}

/** SHA-256 of the backup bytes — identifies a file for the 30-min cache rule. */
export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface RlState {
  date: string;
  count: number;
  hashes: Record<string, number>;
}

/** Reject files too big for the free tier (cheap pre-check on file.size). */
export function sizeError(bytes: number): string | null {
  if (bytes > FREE_TIER.maxBytes) {
    return `This backup is ${(bytes / 1024 ** 3).toFixed(1)} GB. The free tier handles up to ${
      FREE_TIER.maxBytes / 1024 ** 3
    } GB — sign up to recover larger backups.`;
  }
  return null;
}

/** Count a parse against the daily free limit. Re-parsing the same file (same
 * hash) within 30 minutes is free and doesn't burn an attempt. */
export function checkParse(hash: string): RateCheck {
  if (typeof localStorage === "undefined") {
    return { allowed: true, remaining: FREE_TIER.parsesPerDay, cached: false };
  }
  const today = new Date().toISOString().slice(0, 10);
  let state: RlState;
  try {
    state = JSON.parse(localStorage.getItem(RL_KEY) || "null") as RlState;
  } catch {
    state = null as unknown as RlState;
  }
  if (!state || state.date !== today) state = { date: today, count: 0, hashes: {} };

  const now = Date.now();
  for (const h of Object.keys(state.hashes)) {
    if (now - state.hashes[h] > CACHE_MS) delete state.hashes[h];
  }

  // Same file, recently parsed → instant reload, no attempt consumed.
  if (state.hashes[hash]) {
    state.hashes[hash] = now;
    localStorage.setItem(RL_KEY, JSON.stringify(state));
    return { allowed: true, remaining: Math.max(0, FREE_TIER.parsesPerDay - state.count), cached: true };
  }

  if (state.count >= FREE_TIER.parsesPerDay) {
    return {
      allowed: false,
      remaining: 0,
      cached: false,
      reason: `You've used all ${FREE_TIER.parsesPerDay} free recoveries today. Sign up for more, or come back tomorrow — already-recovered files still reload instantly.`,
    };
  }

  state.count++;
  state.hashes[hash] = now;
  localStorage.setItem(RL_KEY, JSON.stringify(state));
  return { allowed: true, remaining: FREE_TIER.parsesPerDay - state.count, cached: false };
}
