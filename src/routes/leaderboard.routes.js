import { Router } from "express";
import * as c from "../controllers/leaderboard.controller.js";
import auth from "../middlewares/authmiddleware.js";
import validate from "../middlewares/validate.js";
import { leaderboard as s } from "../validators/schemas.js";

const router = Router();

router.get("/:tournamentId", auth, validate({ params: s.tournament, query: s.page }), c.full);
router.get("/:tournamentId/top/:n", auth, validate({ params: s.top }), c.topPlayers);
router.get("/:tournamentId/user/:userId", auth, validate({ params: s.user }), c.userRank);
router.get("/:tournamentId/me/around", auth, validate({ params: s.tournament, query: s.around }), c.around);
router.get("/:tournamentId/stream", auth, validate({ params: s.tournament }), c.stream);

export default router;
