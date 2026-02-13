import { Worker } from "bullmq";
import bullRedis from "../config/redis.bull.js";
import leaderboardService from "../services/leaderboard.service.js";

const worker = new Worker(
    "leaderboard",
    async (job) => {
        const { tournamentId } = job.data;

        console.log(`->> Recalculating leaderboard for tournament ${tournamentId}`);

        await leaderboardService.full(tournamentId);

        return { success: true };
    },
    {
        connection: bullRedis
    }
);

worker.on("completed", (job) => {
    console.log(`Leaderboard updated for tournament ${job.data.tournamentId}`);
});

worker.on("failed", (job, err) => {
    console.error("Leaderboard job failed:", err.message);
});
