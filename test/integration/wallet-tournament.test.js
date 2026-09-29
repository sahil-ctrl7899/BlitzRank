import { boot } from "../helpers.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

let t, admin;
before(async () => { t = await boot(); admin = await t.makeUser("admin", "ADMIN"); });
after(() => t.shutdown());

const count = (p) => p.then((rs) => rs.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {}));

test("concurrent debits can never overdraw a wallet", async () => {
  const u = await t.makeUser("spender", "USER", 100);
  const results = await count(Promise.all(
    Array.from({ length: 30 }, () => t.api().post(`/users/${u.user.id}/debit`).set(admin.auth).send({ amount: 10 }))
  ));
  assert.equal(results[200], 10);
  assert.equal(results[402], 20);
  const bal = await t.api().get(`/users/${u.user.id}/balance`).set(admin.auth);
  assert.equal(bal.body.balance, "0.00");
  assert.equal(await t.WalletTransaction.count({ where: { userId: u.user.id } }), 10);
});

test("concurrent credits are all applied (no lost updates)", async () => {
  const u = await t.makeUser("saver", "USER", 0);
  await Promise.all(Array.from({ length: 40 }, () => t.api().post(`/users/${u.user.id}/credit`).set(admin.auth).send({ amount: 2.5 })));
  assert.equal((await t.api().get(`/users/${u.user.id}/balance`).set(admin.auth)).body.balance, "100.00");
});

test("amount validation rejects negative, zero and 3-decimal values", async () => {
  const u = await t.makeUser("val", "USER", 10);
  for (const amount of [-5, 0, "1.234", "abc"]) {
    assert.equal((await t.api().post(`/users/${u.user.id}/credit`).set(admin.auth).send({ amount })).status, 400, String(amount));
  }
});

test("double-clicking 'join' charges exactly once", async () => {
  const cup = await t.makeTournament();
  const u = await t.makeUser("clicker", "USER", 10); // exactly one entry fee
  const results = await count(Promise.all(
    Array.from({ length: 20 }, () => t.api().post(`/tournaments/${cup.id}/join`).set(u.auth))
  ));
  assert.equal(results[200], 1);
  assert.ok(!results[500], "no unhandled server errors");
  assert.equal(await t.Participant.count({ where: { userId: u.user.id, tournamentId: cup.id } }), 1);
  assert.equal((await t.User.findByPk(u.user.id)).balance, "0.00");
  assert.equal(await t.WalletTransaction.count({ where: { userId: u.user.id, reason: "JOIN_TOURNAMENT" } }), 1);
});

test("joining tracks the prize pool; insufficient funds -> 402 and no participant row", async () => {
  const cup = await t.makeTournament({ entryFee: "25.00" });
  const rich = await t.makeUser("rich", "USER", 100);
  const poor = await t.makeUser("poor", "USER", 5);
  assert.equal((await t.api().post(`/tournaments/${cup.id}/join`).set(rich.auth)).status, 200);
  const res = await t.api().post(`/tournaments/${cup.id}/join`).set(poor.auth);
  assert.equal(res.status, 402);
  assert.equal(res.body.error.code, "INSUFFICIENT_FUNDS");
  assert.equal(await t.Participant.count({ where: { tournamentId: cup.id } }), 1);
  assert.equal((await t.Tournament.findByPk(cup.id)).prizePool, "25.00");
});

test("only USER accounts can join; admins are rejected by RBAC", async () => {
  const cup = await t.makeTournament();
  assert.equal((await t.api().post(`/tournaments/${cup.id}/join`).set(admin.auth)).status, 403);
});

test("removing a participant refunds them and shrinks the pool", async () => {
  const cup = await t.makeTournament({ entryFee: "10.00" });
  const u = await t.makeUser("leaver", "USER", 30);
  await t.api().post(`/tournaments/${cup.id}/join`).set(u.auth);
  const res = await t.api().delete(`/tournaments/${cup.id}/participants/${u.user.id}`).set(admin.auth);
  assert.equal(res.status, 200);
  assert.equal((await t.User.findByPk(u.user.id)).balance, "30.00");
  assert.equal((await t.Tournament.findByPk(cup.id)).prizePool, "0.00");
  assert.equal((await t.api().delete(`/tournaments/${cup.id}/participants/${u.user.id}`).set(admin.auth)).status, 404);
});

test("state machine: illegal transitions 409, concurrent admin races have one winner", async () => {
  const cup = await t.makeTournament();
  const skip = await t.api().patch(`/tournaments/${cup.id}/status`).set(admin.auth).send({ status: "COMPLETED" });
  assert.equal(skip.status, 409);
  assert.equal(skip.body.error.code, "INVALID_TRANSITION");

  const results = await count(Promise.all(
    Array.from({ length: 6 }, () => t.api().patch(`/tournaments/${cup.id}/status`).set(admin.auth).send({ status: "ACTIVE" }))
  ));
  assert.equal(results[200], 1);
  assert.equal(results[409], 5);
});

test("joining is closed once a tournament is ACTIVE", async () => {
  const cup = await t.makeTournament({ status: "ACTIVE" });
  const u = await t.makeUser("late", "USER", 100);
  const res = await t.api().post(`/tournaments/${cup.id}/join`).set(u.auth);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "NOT_OPEN");
  assert.equal((await t.User.findByPk(u.user.id)).balance, "100.00"); // nothing charged
});

test("tournament creation validates input and busts the list cache", async () => {
  const bad = await t.api().post("/tournaments").set(admin.auth).send({
    name: "x", entryFee: 5, startTime: "2030-01-02T00:00:00Z", endTime: "2030-01-01T00:00:00Z"
  });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, "VALIDATION_ERROR");

  const before = (await t.api().get("/tournaments")).body.length; // primes cache
  const ok = await t.api().post("/tournaments").set(admin.auth).send({
    name: "Fresh Cup", entryFee: 5, startTime: "2030-01-01T00:00:00Z", endTime: "2030-01-02T00:00:00Z"
  });
  assert.equal(ok.status, 201);
  assert.equal((await t.api().get("/tournaments")).body.length, before + 1);
  assert.equal((await t.api().get("/tournaments/999999")).status, 404);
});
