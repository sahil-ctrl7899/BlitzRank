process.env.NODE_ENV = "test";
import { test } from "node:test";
import assert from "node:assert/strict";
import { computePayouts, netPool, PRIZE_WEIGHTS } from "../../src/services/payout.logic.js";
import { toCents, fromCents } from "../../src/lib/money.js";

const sum = (a) => a.reduce((x, y) => x + y, 0n);

test("money round-trips without float error", () => {
  assert.equal(toCents("0.1") + toCents("0.2"), toCents("0.3")); // 0.1 + 0.2 !== 0.3 in floats
  assert.equal(fromCents(toCents("1234.5")), "1234.50");
  assert.equal(fromCents(-5n), "-0.05");
  assert.throws(() => toCents("1.234"));
  assert.throws(() => toCents("abc"));
});

test("prize weights sum to 100", () => assert.equal(PRIZE_WEIGHTS.reduce((a, b) => a + b), 100));

test("payouts split 50/30/20 and always sum exactly to the pool", () => {
  for (const pool of [100n, 1n, 7n, 99999n, 1_000_003n]) {
    for (const winners of [1, 2, 3, 10]) {
      const shares = computePayouts(pool, winners);
      assert.equal(sum(shares), pool, `pool=${pool} winners=${winners}`);
      assert.ok(shares.every((s) => s >= 0n));
    }
  }
  assert.deepEqual(computePayouts(10000n, 3), [5000n, 3000n, 2000n]);
});

test("fewer winners than tiers renormalise; 1 winner takes all", () => {
  assert.deepEqual(computePayouts(10000n, 1), [10000n]);
  assert.deepEqual(computePayouts(10000n, 2), [6250n, 3750n]);
  assert.deepEqual(computePayouts(0n, 3), []);
  assert.deepEqual(computePayouts(500n, 0), []);
});

test("rake is deducted from the gross pool in integer cents", () => {
  assert.equal(netPool("80.00", 10), 7200n);
  assert.equal(netPool("0.03", 10), 3n); // rounds the rake down, never over-charges
  assert.equal(netPool("100.00", 2.5), 9750n);
});
