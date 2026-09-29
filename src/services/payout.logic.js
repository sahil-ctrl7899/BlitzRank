import { toCents, fromCents } from "../lib/money.js";

/** Prize split by finishing position (must sum to 100). */
export const PRIZE_WEIGHTS = [50, 30, 20];

/** Pool after the platform's cut, in cents. */
export const netPool = (grossPool, rakePercent) => {
  const gross = toCents(grossPool);
  // rakePercent may be fractional; work in basis points to stay in integers.
  const bps = BigInt(Math.round(rakePercent * 100));
  return gross - (gross * bps) / 10_000n;
};

/**
 * Splits `poolCents` between `winners` finishers. With fewer winners than prize tiers the
 * weights are renormalised (1 winner takes all). Rounding remainder goes to 1st place, so the
 * result always sums to exactly the pool - no cent is created or lost.
 */
export function computePayouts(poolCents, winners) {
  if (winners <= 0 || poolCents <= 0n) return [];
  const weights = PRIZE_WEIGHTS.slice(0, winners).map(BigInt);
  const total = weights.reduce((a, b) => a + b, 0n);
  const shares = weights.map((w) => (poolCents * w) / total);
  shares[0] += poolCents - shares.reduce((a, b) => a + b, 0n);
  return shares;
}

export const formatPayouts = (shares) => shares.map(fromCents);
