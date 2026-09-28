import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import requestContext from "./middlewares/requestContext.js";
import metricsMiddleware from "./middlewares/metrics.js";
import rateLimit from "./middlewares/rateLimit.js";
import errorHandler, { notFoundHandler } from "./middlewares/errormiddleware.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import tournamentRoutes from "./routes/tournament.routes.js";
import scoreRoutes from "./routes/score.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import systemRoutes from "./routes/system.routes.js";
import docsRouter from "./docs.js";
import logger from "./utils/logger.js";
import { isTest } from "./config/env.js";

export default function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // one hop: the load balancer. Needed for correct req.ip in rate limiting.

  app.use(requestContext);
  app.use(helmet({ contentSecurityPolicy: false })); // JSON API; swagger-ui needs inline assets
  app.use(cors());
  app.use(express.json({ limit: "100kb" }));
  app.use(metricsMiddleware);
  if (!isTest) {
    app.use(morgan(":method :url :status :res[content-length] - :response-time ms", {
      stream: { write: (line) => logger.info(line.trim(), { type: "access" }) },
      skip: (req) => req.path === "/health" || req.path === "/metrics"
    }));
  }

  app.use(systemRoutes);
  app.use("/docs", ...docsRouter());

  // Coarse global budget per IP; hot or abuse-prone routes add their own tighter limits.
  app.use(rateLimit({ name: "global", capacity: 200, refillPerSec: 50 }));

  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/tournaments", tournamentRoutes);
  app.use("/score", scoreRoutes);
  app.use("/leaderboard", leaderboardRoutes);
  app.get("/", (_req, res) => res.json({ name: "BlitzRank API", docs: "/docs" }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
