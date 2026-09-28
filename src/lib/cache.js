import { redis } from "../config/redis.js";
import { cacheEvents } from "./metrics.js";
import logger from "../utils/logger.js";

const inflight = new Map();

// +-10% jitter so keys written together don't all expire (and stampede the DB) together.
const jitter = (ttl) => Math.round(ttl * (0.9 + Math.random() * 0.2));

/**
 * Cache-aside with in-process request coalescing ("singleflight"): N concurrent misses for
 * one key trigger a single loader call. Redis failures degrade to a direct DB read.
 */
export async function cached(key, ttlSeconds, loader) {
  try {
    const hit = await redis.get(key);
    if (hit !== null) {
      cacheEvents.inc({ result: "hit" });
      return JSON.parse(hit);
    }
  } catch (err) {
    logger.warn("cache read failed", { key, error: err.message });
  }
  cacheEvents.inc({ result: "miss" });

  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    const value = await loader();
    // Cache null-ish results briefly too, so missing ids can't be used to hammer the DB.
    const ttl = value == null ? Math.min(ttlSeconds, 10) : ttlSeconds;
    try {
      await redis.set(key, JSON.stringify(value ?? null), "EX", jitter(ttl));
    } catch (err) {
      logger.warn("cache write failed", { key, error: err.message });
    }
    return value;
  })().finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

export async function invalidate(...keys) {
  const flat = keys.flat().filter(Boolean);
  if (!flat.length) return;
  try {
    await redis.del(...flat);
  } catch (err) {
    logger.warn("cache invalidate failed", { keys: flat, error: err.message });
  }
}

export const keys = {
  tournamentList: (status) => `tournaments:list:${status ?? "all"}`,
  tournamentLists: ["all", "OPEN", "ACTIVE", "COMPLETED"].map((s) => `tournaments:list:${s}`),
  tournament: (id) => `tournaments:${id}`,
  participants: (id) => `tournaments:${id}:participants`,
  user: (id) => `users:${id}`,
  authUser: (id) => `auth:user:${id}`
};
