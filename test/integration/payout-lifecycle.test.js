import { boot } from "../helpers.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

let t, payouts, tournamentService, admin;
before(async () => {
  t = await boot();
  payouts = await import("../../src/services/payout.service.js");
  ({ default: tournamentService } = await import("../../src/services/tournament.service.js"));
  admin = await t.makeUser("admin", "ADMIN");
});
after(() => t.shutdown());

const totalBalance = async () => Number((await t.sequelize.query(`SELECT COALESCE(SUM(balance),0) AS s FROM "Users"`))[0][0].s);

async function playedTournament(scores, entryFee = "20.00") {
  const cup = await t.makeTournament({ status: "OPEN", entryFee });
  const users = [];
  for (const [i] of scores.entries()) {
    const u = await t.makeUser(`w${cup.id}_${i}`, "USER", 100);
    assert.equal((await t.api().post(`/tournaments/${cup.id}/join`).set(u.auth)).status, 200);
    users.push(u);
  }
  await t.Tournament.update({ status: "ACTIVE" }, { where: { id: cup.id } });
  for (const [i, s] of scores.entries()) {
    await t.Participant.update({ currentScore: s }, { where: { userId: users[i].user.id, tournamentId: cup.id } });
  }
  await t.Tournament.update({ status: "COMPLETED" }, { where: { id: cup.id } });
  return { cup, users };
}

test("prizes: 90% of the pool split 50/30/20, 4th place gets nothing, ranks persisted", async () => {
  const { cup, users } = await playedTournament([5, 40, 10, 25]); // pool 80.00 -> net 72.00
  await payouts.distributePrizes(cup.id);

  const bal = async (u) => Number((await t.User.findByPk(u.user.id)).balance);
  assert.equal(await bal(users[1]), 80 + 36);    // 1st  (100-20 entry) + 36.00
  assert.equal(await bal(users[3]), 80 + 21.6);  // 2nd
  assert.equal(await bal(users[2]), 80 + 14.4);  // 3rd
  assert.equal(await bal(users[0]), 80);         // 4th
  const ranks = await t.Participant.findAll({ where: { tournamentId: cup.id }, order: [["rank", "ASC"]] });
  assert.deepEqual(ranks.map((p) => p.userId), [users[1], users[3], users[2], users[0]].map((u) => u.user.id));
  assert.equal((await t.Tournament.findByPk(cup.id)).payoutStatus, "DONE");

  const listed = await t.api().get(`/tournaments/${cup.id}/payouts`);
  assert.equal(listed.body.length, 3);
});

test("payout is exactly-once even when 8 workers race / retry", async () => {
  const { cup } = await playedTournament([9, 8, 7]);
  const before = await totalBalance();
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => payouts.distributePrizes(cup.id)));
  assert.ok(results.every((r) => r.status === "fulfilled"), JSON.stringify(results.filter((r) => r.status === "rejected")));
  assert.equal(results.filter((r) => r.value.paid).length, 1);
  assert.equal(await t.WalletTransaction.count({ where: { referenceId: cup.id, reason: "TOURNAMENT_PRIZE" } }), 3);
  // 60.00 pool - 10% rake = 54.00 injected, exactly once.
  assert.equal(Math.round((await totalBalance() - before) * 100) / 100, 54);
  // A later retry is a no-op.
  assert.equal((await payouts.distributePrizes(cup.id)).skipped, "already_paid");
});

test("the DB itself refuses a duplicate prize even if application code tried", async () => {
  const { cup, users } = await playedTournament([3, 2]);
  await payouts.distributePrizes(cup.id);
  await assert.rejects(
    t.WalletTransaction.create({ userId: users[0].user.id, type: "CREDIT", amount: 1, reason: "TOURNAMENT_PRIZE", referenceId: cup.id }),
    /unique|duplicate/i
  );
});

test("if nobody scored, entry fees are refunded and no rake is taken", async () => {
  const { cup, users } = await playedTournament([0, 0, 0]);
  await payouts.distributePrizes(cup.id);
  for (const u of users) assert.equal((await t.User.findByPk(u.user.id)).balance, "100.00");
  assert.equal(await t.WalletTransaction.count({ where: { referenceId: cup.id, reason: "TOURNAMENT_REFUND" } }), 3);
});

test("a single scorer takes the whole net pool", async () => {
  const { cup, users } = await playedTournament([0, 12, 0], "10.00");
  await payouts.distributePrizes(cup.id);
  assert.equal((await t.User.findByPk(users[1].user.id)).balance, "117.00"); // 90 left after entry + (3 x 10 pool - 10% rake = 27)
  assert.equal((await t.User.findByPk(users[0].user.id)).balance, "90.00");
});

test("payout refuses a tournament that isn't completed (BullMQ will retry later)", async () => {
  const cup = await t.makeTournament({ status: "ACTIVE" });
  await assert.rejects(payouts.distributePrizes(cup.id), /not completed/);
});

test("lifecycle tick promotes OPEN->ACTIVE->COMPLETED by time and enqueues payouts idempotently", async () => {
  const now = Date.now();
  const starting = await t.makeTournament({ status: "OPEN", startTime: new Date(now - 1000), endTime: new Date(now + 3600_000) });
  const ending = await t.makeTournament({ status: "ACTIVE", startTime: new Date(now - 7200_000), endTime: new Date(now - 1000) });
  const future = await t.makeTournament({ status: "OPEN", startTime: new Date(now + 3600_000), endTime: new Date(now + 7200_000) });

  const r1 = await tournamentService.advanceLifecycle();
  assert.ok(r1.started >= 1 && r1.finished >= 1);
  assert.equal((await t.Tournament.findByPk(starting.id)).status, "ACTIVE");
  assert.equal((await t.Tournament.findByPk(ending.id)).status, "COMPLETED");
  assert.equal((await t.Tournament.findByPk(future.id)).status, "OPEN");
  assert.ok(await t.payoutQueue.getJob(`payout-${ending.id}`), "payout job enqueued");

  // Concurrent ticks (multiple worker replicas) must not double-enqueue or throw.
  await Promise.all([1, 2, 3, 4].map(() => tournamentService.advanceLifecycle()));
  const jobs = (await t.payoutQueue.getJobs(["waiting", "delayed", "active", "completed"])).filter((j) => j.id === `payout-${ending.id}`);
  assert.equal(jobs.length, 1);
});
