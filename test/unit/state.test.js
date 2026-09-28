process.env.NODE_ENV = "test";
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore } from "../../src/services/score.logic.js";
import { canTransition } from "../../src/services/tournament.state.js";

test("tournament state machine only moves forward one step", () => {
  assert.ok(canTransition("OPEN", "ACTIVE"));
  assert.ok(canTransition("ACTIVE", "COMPLETED"));
  assert.ok(!canTransition("OPEN", "COMPLETED"));
  assert.ok(!canTransition("COMPLETED", "OPEN"));
  assert.ok(!canTransition("ACTIVE", "OPEN"));
  assert.ok(!canTransition("COMPLETED", "COMPLETED"));
});

test("score is win/bet rounded to 4dp", () => {
  assert.equal(computeScore(10, 25), 2.5);
  assert.equal(computeScore(3, 1), 0.3333);
  assert.equal(computeScore(5, 0), 0);
});
