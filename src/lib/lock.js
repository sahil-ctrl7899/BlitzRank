import { randomUUID } from "node:crypto";
import { redis } from "../config/redis.js";

const RELEASE = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;

/**
 * Single-node Redis lock (SET NX PX + compare-and-delete release). Good for
 * "only one instance rebuilds this" style coordination; NOT a correctness guard for money -
 * that is what Postgres constraints and atomic SQL are for.
 */
export async function withLock(name, ttlMs, fn) {
  const token = randomUUID();
  const ok = await redis.set(`lock:${name}`, token, "PX", ttlMs, "NX");
  if (!ok) return { acquired: false };
  try {
    return { acquired: true, value: await fn() };
  } finally {
    await redis.eval(RELEASE, 1, `lock:${name}`, token).catch(() => {});
  }
}
