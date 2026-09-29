import { consume } from "../lib/rateLimiter.js";
import { env } from "../config/env.js";
import { tooMany } from "../errors/AppError.js";
import { rateLimited } from "../lib/metrics.js";
import logger from "../utils/logger.js";

/**
 * Distributed token-bucket limiter. `capacity` = burst size, `refillPerSec` = sustained rate.
 * Fails OPEN if Redis is unavailable: losing rate limiting beats taking the whole API down.
 */
export default ({ name, capacity, refillPerSec, keyFn = (req) => req.ip }) =>
  async (req, res, next) => {
    if (!env.RATE_LIMIT_ENABLED) return next();
    try {
      const r = await consume(`${name}:${keyFn(req)}`, { capacity, refillPerSec });
      res.setHeader("X-RateLimit-Limit", capacity);
      res.setHeader("X-RateLimit-Remaining", r.remaining);
      if (!r.allowed) {
        rateLimited.inc({ policy: name });
        res.setHeader("Retry-After", Math.ceil(r.retryAfterMs / 1000));
        throw tooMany();
      }
    } catch (err) {
      if (err.status === 429) throw err;
      logger.warn("rate limiter unavailable, failing open", { error: err.message });
    }
    next();
  };
