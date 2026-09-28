import { connectDB, sequelize } from "./config/db.js";
import { redis } from "./config/redis.js";
import { startEventBus, stopEventBus } from "./lib/events.js";
import { closeQueues } from "./queues/index.js";
import { startWorkers, stopWorkers } from "./workers/index.js";
import logger from "./utils/logger.js";

await connectDB();
await startEventBus();
const workers = await startWorkers();

async function shutdown(signal) {
  logger.info(`${signal} received, draining workers`);
  setTimeout(() => process.exit(1), 30_000).unref();
  await stopWorkers(workers); // waits for in-flight jobs to finish
  await closeQueues();
  await stopEventBus();
  await redis.quit().catch(() => {});
  await sequelize.close();
  process.exit(0);
}
["SIGTERM", "SIGINT"].forEach((s) => process.on(s, () => shutdown(s)));
