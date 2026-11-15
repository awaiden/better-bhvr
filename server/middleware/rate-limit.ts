import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

export interface RateLimitOptions {
  /** Time window in milliseconds (default: 60_000). */
  windowMs?: number;
  /** Maximum requests allowed per window (default: 100). */
  max?: number;
  /** Maximum number of distinct keys held in memory (default: 10_000). */
  maxEntries?: number;
  /** Trust X-Forwarded-For / X-Real-IP headers from a reverse proxy (default: true). */
  trustProxy?: boolean;
  /** Derives the rate-limit bucket key for a request. */
  keyGenerator?: (c: Context) => string;
  /** Error message returned in the 429 JSON response. */
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 100;
const DEFAULT_MAX_ENTRIES = 10_000;
const DEFAULT_MESSAGE = "Too Many Requests";
const MAX_PRUNE_PER_WRITE = 8;

function getSocketRemoteAddress(c: Context): string | undefined {
  const env = c.env as
    | {
        incoming?: { socket?: { remoteAddress?: string } };
        server?: { requestIP?: (req: Request) => { address?: string } | null };
      }
    | undefined;
  const bunAddress = env?.server?.requestIP?.(c.req.raw)?.address?.trim();
  if (bunAddress) {
    return bunAddress;
  }
  const nodeAddress = env?.incoming?.socket?.remoteAddress?.trim();
  return nodeAddress || undefined;
}

function defaultKeyGenerator(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = c.req.header("x-forwarded-for");
    if (forwarded) {
      const firstIp = forwarded.split(",")[0]?.trim();
      if (firstIp) {
        return firstIp;
      }
    }

    const realIp = c.req.header("x-real-ip")?.trim();
    if (realIp) {
      return realIp;
    }
  }

  return getSocketRemoteAddress(c) ?? "unknown";
}

function pruneAndEvict(store: Map<string, RateLimitEntry>, now: number, maxEntries: number): void {
  let pruned = 0;
  for (const [key, entry] of store) {
    if (entry.resetAt > now || pruned >= MAX_PRUNE_PER_WRITE) {
      break;
    }
    store.delete(key);
    pruned += 1;
  }

  while (store.size >= maxEntries) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    store.delete(oldestKey);
  }
}

/** Creates an isolated in-memory fixed-window rate-limiting middleware. */
export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options.max ?? DEFAULT_MAX;
  const maxEntries = Math.max(1, options.maxEntries ?? DEFAULT_MAX_ENTRIES);
  const trustProxy = options.trustProxy ?? true;
  const keyGenerator = options.keyGenerator ?? ((c) => defaultKeyGenerator(c, trustProxy));
  const message = options.message ?? DEFAULT_MESSAGE;
  const store = new Map<string, RateLimitEntry>();

  return createMiddleware(async (c, next) => {
    const now = Date.now();
    const key = keyGenerator(c);
    let entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      if (entry) {
        store.delete(key);
      }
      pruneAndEvict(store, now, maxEntries);
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
    } else {
      entry.count += 1;
    }

    const remaining = Math.max(0, max - entry.count);
    const resetEpochSeconds = Math.ceil(entry.resetAt / 1000);

    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(resetEpochSeconds));

    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      c.header("Retry-After", String(retryAfterSeconds));
      return c.json({ error: message }, 429);
    }

    await next();
  });
}
