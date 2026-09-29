import { boot } from "../helpers.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

let t, gs, cup, players;
before(async () => {
  t = await boot();
  gs = await t.makeUser("game_server", "GAME_SERVER");
  cup = await t.makeTournament({ status: "ACTIVE", entryFee: "10.00" });
  players = [];
  for (const name of ["p1", "p2", "p3", "p4"]) {
    const u = await t.makeUser(name, "USER", 100);
    await t.Participant.create({ userId: u.user.id, tournamentId: cup.id });
    players.push(u);
  }
});
after(() => t.shutdown());

const submit = (userId, bet, win, key) => {
  const r = t.api().post("/score/submit").set(gs.auth).send({ userId, tournamentId: cup.id, betAmount: bet, winAmount: win });
  return key ? r.set("Idempotency-Key", key) : r;
};
const dbScore = async (u) => Number((await t.Participant.findOne({ where: { userId: u.user.id, tournamentId: cup.id } })).currentScore);

test("only GAME_SERVER / ADMIN may submit scores", async () => {
  const res = await t.api().post("/score/submit").set(players[0].auth).send({ userId: 1, tournamentId: cup.id, betAmount: 1, winAmount: 1 });
  assert.equal(res.status, 403);
});

test("idempotency: a retried submission is applied exactly once", async () => {
  const first = await submit(players[0].user.id, 10, 25, "round-0001-abc");
  assert.equal(first.status, 201);
  assert.equal(first.body.scoreAdded, 2.5);

  const retry = await submit(players[0].user.id, 10, 25, "round-0001-abc");
  assert.equal(retry.status, 200);
  assert.equal(retry.headers["idempotent-replayed"], "true");
  assert.equal(Number(retry.body.totalScore), 2.5);
  assert.equal(await dbScore(players[0]), 2.5);
});

test("idempotency: 25 simultaneous retries of the same key -> one application", async () => {
  const res = await Promise.all(Array.from({ length: 25 }, () => submit(players[1].user.id, 10, 10, "parallel-key-1")));
  assert.equal(res.filter((r) => r.status === 201).length, 1);
  assert.equal(res.filter((r) => r.status === 200).length, 24);
  assert.equal(await dbScore(players[1]), 1);
});

test("a key can't be reused for a different player", async () => {
  const res = await submit(players[2].user.id, 10, 10, "round-0001-abc");
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "IDEMPOTENCY_KEY_REUSED");
});

test("no lost updates: 60 concurrent submissions for one player sum exactly", async () => {
  const p = players[3];
  const res = await Promise.all(Array.from({ length: 60 }, (_, i) => submit(p.user.id, 4, 2, `bulk-${String(i).padStart(4, "0")}`)));
  assert.ok(res.every((r) => r.status === 201));
  assert.equal(await dbScore(p), 30); // 60 * 0.5
  assert.equal(await t.ScoreHistory.count({ where: { participantId: (await t.Participant.findOne({ where: { userId: p.user.id } })).id } }), 60);
});

test("validation: bad bet/win values are rejected", async () => {
  for (const [bet, win] of [[0, 5], [-1, 5], [5, -1]]) {
    assert.equal((await submit(players[0].user.id, bet, win)).status, 400);
  }
  assert.equal((await submit(players[0].user.id, 5, 5, "bad key!")).status, 400);
});

test("scores are rejected for non-active tournaments and non-participants", async () => {
  const open = await t.makeTournament({ status: "OPEN" });
  const r1 = await t.api().post("/score/submit").set(gs.auth).send({ userId: players[0].user.id, tournamentId: open.id, betAmount: 1, winAmount: 1 });
  assert.equal(r1.status, 409);
  const stranger = await t.makeUser("stranger");
  const r2 = await t.api().post("/score/submit").set(gs.auth).send({ userId: stranger.user.id, tournamentId: cup.id, betAmount: 1, winAmount: 1 });
  assert.equal(r2.status, 404);
});

test("leaderboard (Redis ZSET) ranks correctly and matches Postgres", async () => {
  const viewer = players[0];
  const top = await t.api().get(`/leaderboard/${cup.id}/top/3`).set(viewer.auth);
  assert.equal(top.status, 200);
  assert.deepEqual(top.body.players.map((p) => p.username), ["p4", "p1", "p2"]);
  assert.deepEqual(top.body.players.map((p) => p.rank), [1, 2, 3]);

  const rank = await t.api().get(`/leaderboard/${cup.id}/user/${players[2].user.id}`).set(viewer.auth);
  assert.equal(rank.body.rank, 4);
  assert.equal(rank.body.totalParticipants, 4);

  const page = await t.api().get(`/leaderboard/${cup.id}?limit=2&offset=2`).set(viewer.auth);
  assert.equal(page.body.total, 4);
  assert.deepEqual(page.body.entries.map((e) => e.rank), [3, 4]);

  const around = await t.api().get(`/leaderboard/${cup.id}/me/around?radius=1`).set(players[1].auth);
  assert.deepEqual(around.body.entries.map((e) => e.username), ["p1", "p2", "p3"]);

  assert.equal((await t.api().get(`/leaderboard/${cup.id}/user/99999`).set(viewer.auth)).status, 404);
  assert.equal((await t.api().get(`/leaderboard/${cup.id}/top/1000`).set(viewer.auth)).status, 400);
});

test("reconcile job repairs Redis drift from the Postgres source of truth", async () => {
  const { default: lb } = await import("../../src/services/leaderboard.service.js");
  await t.redis.zincrby(`lb:${cup.id}`, 9999, String(players[2].user.id)); // simulate corruption
  assert.equal((await lb.top(cup.id, 1))[0].username, "p3");

  await lb.rebuild(cup.id);
  assert.deepEqual((await lb.top(cup.id, 4)).map((e) => e.username), ["p4", "p1", "p2", "p3"]);
  for (const e of await lb.top(cup.id, 4)) {
    const p = players.find((x) => x.user.id === e.userId);
    assert.equal(e.score, await dbScore(p));
  }
});

test("a cold Redis (flushed) rebuilds the board lazily from Postgres", async () => {
  await t.redis.flushdb();
  const res = await t.api().get(`/leaderboard/${cup.id}/top/1`).set(players[0].auth);
  assert.equal(res.body.players[0].username, "p4");
});

test("SSE stream delivers a snapshot then live updates across the pub/sub bus", async () => {
  const { startEventBus } = await import("../../src/lib/events.js");
  await startEventBus();
  const server = t.app.listen(0);
  const { port } = server.address();
  const controller = new AbortController();
  const res = await fetch(`http://127.0.0.1:${port}/leaderboard/${cup.id}/stream`, {
    headers: players[0].auth, signal: controller.signal
  });
  assert.equal(res.headers.get("content-type"), "text/event-stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const until = async (needle, ms = 5000) => {
    const deadline = Date.now() + ms;
    while (!buf.includes(needle)) {
      if (Date.now() > deadline) throw new Error(`timeout waiting for ${needle}; got ${buf}`);
      const { value } = await Promise.race([
        reader.read(), new Promise((_, rej) => setTimeout(() => rej(new Error("read timeout")), ms))
      ]);
      buf += decoder.decode(value);
    }
  };
  await until("event: snapshot");
  await submit(players[2].user.id, 1, 1000, "sse-boost-0001"); // p3 jumps to first place
  await until("event: update");
  assert.ok(buf.split("event: update")[1].includes('"username":"p3"'));

  controller.abort();
  server.close();
});
