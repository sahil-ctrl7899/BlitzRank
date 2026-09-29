import { Worker } from "bullmq";
import { bullConnection, lifecycleQueue, QUEUES } from "../queues/index.js";
import leaderboard from "../services/leaderboard.service.js";
import tournamentService from "../services/tournament.service.js";
import { distributePrizes } from "../services/payout.service.js";
import { jobsProcessed } from "../lib/metrics.js";
import logger from "../utils/logger.js";

const wrap = (queue, worker) => {
  worker.on("completed", () => jobsProcessed.inc({ queue, outcome: "completed" }));
  worker.on("failed", (job, err) => {
    const final = job && job.attemptsMade >= (job.opts.attempts ?? 1);
    jobsProcessed.inc({ queue, outcome: final ? "dead" : "retry" });
    logger.error("job failed", { queue, jobId: job?.id, attempt: job?.attemptsMade, final, error: err.message });
  });
  worker.on("error", (err) => logger.error("worker error", { queue, error: err.message }));
  return worker;
};

export async function startWorkers() {
  const opts = { connection: bullConnection };

  const leaderboardWorker = wrap(QUEUES.leaderboard, new Worker(QUEUES.leaderboard, async (job) => {
    const n = await leaderboard.rebuild(job.data.tournamentId);
    return { rebuilt: n };
  }, { ...opts, concurrency: 10 }));

  const payoutWorker = wrap(QUEUES.payout, new Worker(QUEUES.payout, async (job) => {
    return distributePrizes(job.data.tournamentId);
  }, { ...opts, concurrency: 2 }));

  const lifecycleWorker = wrap(QUEUES.lifecycle, new Worker(QUEUES.lifecycle, async () => {
    return tournamentService.advanceLifecycle();
  }, { ...opts, concurrency: 1 }));

  // Repeatable scheduler stored in Redis: replaces per-process cron. However many worker
  // replicas are running, BullMQ emits each tick once, so transitions are never duplicated.
  await lifecycleQueue.upsertJobScheduler("tournament-lifecycle", { every: 15_000 }, {
    name: "tick", opts: { removeOnComplete: true, removeOnFail: 50, attempts: 1 }
  });

  logger.info("workers started", { queues: Object.values(QUEUES) });
  return [leaderboardWorker, payoutWorker, lifecycleWorker];
}

export const stopWorkers = (workers) => Promise.allSettled(workers.map((w) => w.close()));
