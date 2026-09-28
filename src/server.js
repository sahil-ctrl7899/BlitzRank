import { env } from "./config/env.js";
import createApp from "./app.js";
import { connectDB, sequelize } from "./config/db.js";
import { redis } from "./config/redis.js";
import { startEventBus, stopEventBus } from "./lib/events.js";
import { closeQueues } from "./queues/index.js";
import { startWorkers, stopWorkers } from "./workers/index.js";
import logger from "./utils/logger.js";

await connectDB();
await startEventBus();
// Dev convenience: run background workers inside the API process. In production run `npm run worker`.
const workers = process.env.EMBEDDED_WORKERS === "true" ? await startWorkers() : [];

const server = createApp().listen(env.PORT, () => logger.info(`API listening on :${env.PORT}`));

// Graceful shutdown: stop accepting connections, let in-flight requests + jobs finish, then close deps.
let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  logger.info(`${signal} received, shutting down`);
  const force = setTimeout(() => process.exit(1), 15_000).unref();
  await new Promise((resolve) => { server.close(resolve); server.closeIdleConnections?.(); });
  await stopWorkers(workers);
  await closeQueues();
  await stopEventBus();
  await redis.quit().catch(() => {});
  await sequelize.close();
  clearTimeout(force);
  process.exit(0);
}
["SIGTERM", "SIGINT"].forEach((s) => process.on(s, () => shutdown(s)));
process.on("unhandledRejection", (err) => logger.error("unhandled rejection", { error: String(err), stack: err?.stack }));
