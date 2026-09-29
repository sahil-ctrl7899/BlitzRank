import { Queue } from "bullmq";
import { createBullConnection } from "../config/redis.js";

export const QUEUES = { leaderboard: "leaderboard", payout: "payout", lifecycle: "lifecycle" };

export const bullConnection = createBullConnection();

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { age: 3600, count: 1000 },
  // Exhausted jobs stay in BullMQ's `failed` set: that is the dead-letter queue.
  removeOnFail: { age: 7 * 24 * 3600 }
};

const make = (name) => new Queue(name, { connection: bullConnection, defaultJobOptions });

export const leaderboardQueue = make(QUEUES.leaderboard);
export const payoutQueue = make(QUEUES.payout);
export const lifecycleQueue = make(QUEUES.lifecycle);

/** Debounced reconcile: a burst of N score submissions collapses into one rebuild job. */
export const scheduleLeaderboardReconcile = (tournamentId, delay = 5000) =>
  leaderboardQueue.add("reconcile", { tournamentId }, { jobId: `reconcile-${tournamentId}`, delay, removeOnComplete: true });

/** jobId makes enqueueing idempotent: the same payout can never be queued twice. */
export const enqueuePayout = (tournamentId) =>
  payoutQueue.add("distribute", { tournamentId }, { jobId: `payout-${tournamentId}` });

export async function closeQueues() {
  await Promise.allSettled([leaderboardQueue.close(), payoutQueue.close(), lifecycleQueue.close()]);
  await bullConnection.quit().catch(() => {});
}
