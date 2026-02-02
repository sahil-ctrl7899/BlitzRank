import { Router } from "express";
import controller from "../controllers/leaderboard.controller.js";
import auth from "../middlewares/authmiddleware.js";

// Logged-in users can view leaderboard
const router = Router();

router.get("/:tournamentId", auth, controller.fullLeaderboard);
router.get("/:tournamentId/top/:n", auth, controller.topPlayers);
router.get("/:tournamentId/user/:userId", auth, controller.userRank);

export default router;

