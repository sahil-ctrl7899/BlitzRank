import { EventEmitter } from "node:events";
import { redis, createSubscriber } from "../config/redis.js";
import logger from "../utils/logger.js";

/**
 * Cross-instance event bus over Redis pub/sub. One pattern subscription per process fans out
 * to in-process listeners (SSE streams), so 10k open streams still cost one Redis connection.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

let subscriber;
export async function startEventBus() {
  if (subscriber) return;
  subscriber = createSubscriber();
  await subscriber.psubscribe("events:*");
  subscriber.on("pmessage", (_pattern, channel, message) => {
    try {
      emitter.emit(channel, JSON.parse(message));
    } catch (err) {
      logger.warn("bad event payload", { channel, error: err.message });
    }
  });
}

export const publish = (channel, payload) =>
  redis.publish(`events:${channel}`, JSON.stringify(payload)).catch((err) =>
    logger.warn("publish failed", { channel, error: err.message })
  );

export const subscribe = (channel, handler) => {
  emitter.on(`events:${channel}`, handler);
  return () => emitter.off(`events:${channel}`, handler);
};

export async function stopEventBus() {
  await subscriber?.quit().catch(() => {});
  subscriber = undefined;
}

export const channels = { leaderboard: (tournamentId) => `leaderboard:${tournamentId}` };
