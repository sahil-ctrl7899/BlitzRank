// Sets test env BEFORE any app module is imported (they read env at import time).
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgres://blitz:blitz@127.0.0.1:5432/blitzrank_test";
process.env.REDIS_URL ??= "redis://127.0.0.1:6379/1";
process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-000";
process.env.RATE_LIMIT_ENABLED ??= "false";

import { execSync } from "node:child_process";
import bcrypt from "bcrypt";
import request from "supertest";

export async function boot() {
  execSync("npx sequelize-cli db:migrate", { stdio: "ignore", env: process.env });
  const { sequelize } = await import("../src/config/db.js");
  const { redis } = await import("../src/config/redis.js");
  const models = await import("../src/models/index.js");
  const { default: createApp } = await import("../src/app.js");
  const queues = await import("../src/queues/index.js");
  const events = await import("../src/lib/events.js");

  await sequelize.query(
    `TRUNCATE "ScoreHistories","WalletTransactions","Participants","Tournaments","Users" RESTART IDENTITY CASCADE`
  );
  await redis.flushdb();
  await Promise.all([queues.leaderboardQueue.obliterate({ force: true }), queues.payoutQueue.obliterate({ force: true })]);

  const app = createApp();
  const api = () => request(app);

  const makeUser = async (username, role = "USER", balance = 0) => {
    const user = await models.User.create({ username, password: await bcrypt.hash("Passw0rd!123", 4), role, balance });
    const res = await api().post("/auth/login").send({ username, password: "Passw0rd!123" });
    return { user, token: res.body.accessToken, auth: { Authorization: `Bearer ${res.body.accessToken}` } };
  };

  const makeTournament = (over = {}) =>
    models.Tournament.create({
      name: "Test Cup", entryFee: "10.00", status: "OPEN",
      startTime: new Date(Date.now() - 3600_000), endTime: new Date(Date.now() + 3600_000), ...over
    });

  const shutdown = async () => {
    await queues.closeQueues();
    await events.stopEventBus();
    await redis.quit();
    await sequelize.close();
  };

  return { app, api, sequelize, redis, ...models, ...queues, makeUser, makeTournament, shutdown };
}
