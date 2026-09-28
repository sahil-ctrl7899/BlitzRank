import IORedis from "ioredis";
import { env } from "./env.js";
import logger from "../utils/logger.js";

const common = { lazyConnect: false, enableReadyCheck: true };

const attachLogging = (client, name) => {
  client.on("ready", () => logger.info(`redis ready`, { client: name }));
  client.on("error", (err) => logger.error("redis error", { client: name, error: err.message }));
  return client;
};

/** Shared command connection (cache, rate limiting, ZSET leaderboards, locks). */
export const redis = attachLogging(new IORedis(env.REDIS_URL, { ...common, maxRetriesPerRequest: 2 }), "main");

/** BullMQ requires maxRetriesPerRequest: null, so it gets its own connection. */
export const createBullConnection = () =>
  attachLogging(new IORedis(env.REDIS_URL, { ...common, maxRetriesPerRequest: null }), "bullmq");

/** A connection in subscriber mode can't run normal commands, so pub/sub gets its own. */
export const createSubscriber = () => attachLogging(new IORedis(env.REDIS_URL, common), "subscriber");
