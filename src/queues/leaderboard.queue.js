import { Queue } from "bullmq";
import bullRedis from "../config/redis.bull.js";

export const leaderboardQueue = new Queue("leaderboard", {
  connection: bullRedis
});
