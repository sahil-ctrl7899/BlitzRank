import { Router } from "express";
import { sequelize } from "../config/db.js";
import { redis } from "../config/redis.js";
import { registry } from "../lib/metrics.js";
import { leaderboardQueue, payoutQueue } from "../queues/index.js";

const router = Router();

// Liveness: is the process up? (orchestrator restarts it if not)
router.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// Readiness: can it serve traffic? (load balancer removes it from rotation if not)
router.get("/ready", async (_req, res) => {
  const check = async (fn) => { try { await fn(); return "up"; } catch { return "down"; } };
  const [postgres, cache] = await Promise.all([check(() => sequelize.query("SELECT 1")), check(() => redis.ping())]);
  const ok = postgres === "up" && cache === "up";
  res.status(ok ? 200 : 503).json({ status: ok ? "ready" : "degraded", postgres, redis: cache });
});

router.get("/metrics", async (_req, res) => {
  res.setHeader("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});

router.get("/metrics/queues", async (_req, res) => {
  const [leaderboard, payout] = await Promise.all([leaderboardQueue.getJobCounts(), payoutQueue.getJobCounts()]);
  res.json({ leaderboard, payout });
});

export default router;
