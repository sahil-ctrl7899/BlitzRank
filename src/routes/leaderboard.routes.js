const router = require("express").Router();
const controller = require("../controllers/leaderboard.controller");
const auth = require("../middlewares/authmiddleware");

// Logged-in users can view leaderboard

router.get("/:tournamentId",auth, controller.fullLeaderboard);
router.get("/:tournamentId/top/:n",auth, controller.topPlayers);
router.get("/:tournamentId/user/:userId",auth, controller.userRank);

module.exports = router;
