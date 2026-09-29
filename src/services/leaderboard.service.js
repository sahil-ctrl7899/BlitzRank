import { Op } from "sequelize";
import { Participant, User } from "../models/index.js";
import { redis } from "../config/redis.js";
import { notFound } from "../errors/AppError.js";
import { withLock } from "../lib/lock.js";
import { cached } from "../lib/cache.js";

/*
 * Real-time leaderboards live in a Redis sorted set per tournament (`lb:{id}`, member = userId).
 * ZINCRBY / ZREVRANK / ZREVRANGE are O(log N), so rank lookups stay flat as a tournament grows,
 * whereas the previous "load every participant and findIndex" was O(N) per request.
 * Postgres remains the source of truth; a debounced background job rebuilds the ZSET from it
 * (`rebuild`) which repairs any drift from a crash between DB commit and the Redis write.
 */

const zkey = (id) => `lb:${id}`;
const readyKey = (id) => `lb:${id}:ready`;
const MAX_PAGE = 100;

async function rebuild(tournamentId) {
  const rows = await Participant.findAll({
    where: { tournamentId }, attributes: ["userId", "currentScore"], raw: true
  });
  const tmp = `${zkey(tournamentId)}:rebuild`;
  const pipe = redis.multi().del(tmp);
  for (let i = 0; i < rows.length; i += 500) {
    const args = rows.slice(i, i + 500).flatMap((r) => [Number(r.currentScore), String(r.userId)]);
    pipe.zadd(tmp, ...args);
  }
  // RENAME swaps atomically, so readers never see a half-built board. Empty board -> just delete.
  if (rows.length) pipe.rename(tmp, zkey(tournamentId));
  else pipe.del(zkey(tournamentId));
  pipe.set(readyKey(tournamentId), "1", "EX", 24 * 3600);
  await pipe.exec();
  return rows.length;
}

async function ensure(tournamentId) {
  if (await redis.exists(readyKey(tournamentId))) return;
  const lock = await withLock(`lb-build:${tournamentId}`, 15_000, () => rebuild(tournamentId));
  if (!lock.acquired) await new Promise((r) => setTimeout(r, 100)); // someone else is building
}

const addParticipant = (tournamentId, userId) => redis.zadd(zkey(tournamentId), "NX", 0, String(userId));
const removeParticipant = (tournamentId, userId) => redis.zrem(zkey(tournamentId), String(userId));
const incrementScore = async (tournamentId, userId, delta) =>
  Number(await redis.zincrby(zkey(tournamentId), delta, String(userId)));

async function hydrate(entries, startRank) {
  const ids = entries.map((e) => Number(e.userId));
  const users = await User.findAll({ where: { id: { [Op.in]: ids } }, attributes: ["id", "username"], raw: true });
  const names = new Map(users.map((u) => [u.id, u.username]));
  return entries.map((e, i) => ({
    rank: startRank + i + 1,
    userId: Number(e.userId),
    username: names.get(Number(e.userId)) ?? null,
    score: Number(e.score)
  }));
}

const toEntries = (flat) => {
  const out = [];
  for (let i = 0; i < flat.length; i += 2) out.push({ userId: flat[i], score: flat[i + 1] });
  return out;
};

async function page(tournamentId, { offset = 0, limit = 50 }) {
  await ensure(tournamentId);
  limit = Math.min(limit, MAX_PAGE);
  const [flat, total] = await Promise.all([
    redis.zrevrange(zkey(tournamentId), offset, offset + limit - 1, "WITHSCORES"),
    redis.zcard(zkey(tournamentId))
  ]);
  return { total, offset, limit, entries: await hydrate(toEntries(flat), offset) };
}

const top = async (tournamentId, n) => (await page(tournamentId, { offset: 0, limit: n })).entries;

/** Short-lived shared snapshot so thousands of SSE streams don't each hit Redis + Postgres. */
const snapshot = (tournamentId) => cached(`lb:snap:${tournamentId}`, 1, () => top(tournamentId, 10));

async function userRank(tournamentId, userId) {
  await ensure(tournamentId);
  const [rank, score, total] = await redis
    .multi()
    .zrevrank(zkey(tournamentId), String(userId))
    .zscore(zkey(tournamentId), String(userId))
    .zcard(zkey(tournamentId))
    .exec()
    .then((r) => r.map(([, v]) => v));
  if (rank === null) throw notFound("User is not a participant in this tournament");
  return { rank: rank + 1, score: Number(score), totalParticipants: total };
}

/** The player plus `radius` neighbours either side - the "you are here" view. */
async function around(tournamentId, userId, radius = 3) {
  const { rank } = await userRank(tournamentId, userId);
  const start = Math.max(0, rank - 1 - radius);
  const flat = await redis.zrevrange(zkey(tournamentId), start, rank - 1 + radius, "WITHSCORES");
  return { rank, entries: await hydrate(toEntries(flat), start) };
}

export default {
  rebuild, ensure, addParticipant, removeParticipant, incrementScore,
  page, top, snapshot, userRank, around
};
