import { redis } from "../config/redis.js";

/**
 * Token bucket in a single Lua script -> atomic across any number of API instances.
 * KEYS[1]=bucket  ARGV: capacity, refill/sec, now(ms), cost
 * returns {allowed, remainingTokens, retryAfterMs}
 */
const TOKEN_BUCKET = `
local capacity = tonumber(ARGV[1])
local rate     = tonumber(ARGV[2])
local now      = tonumber(ARGV[3])
local cost     = tonumber(ARGV[4])
local data     = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens   = tonumber(data[1])
local ts       = tonumber(data[2])
if tokens == nil then tokens = capacity; ts = now end
tokens = math.min(capacity, tokens + ((now - ts) / 1000) * rate)
local allowed, retry = 0, 0
if tokens >= cost then tokens = tokens - cost; allowed = 1
else retry = math.ceil(((cost - tokens) / rate) * 1000) end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil((capacity / rate) * 1000) * 2)
return {allowed, math.floor(tokens), retry}
`;

export async function consume(key, { capacity, refillPerSec, cost = 1 }) {
  const [allowed, remaining, retryAfterMs] = await redis.eval(
    TOKEN_BUCKET, 1, `rl:${key}`, capacity, refillPerSec, Date.now(), cost
  );
  return { allowed: allowed === 1, remaining, retryAfterMs };
}
