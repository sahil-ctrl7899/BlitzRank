const router = require("express").Router();
const controller = require("../controllers/tournament.controller");

router.post("/", controller.createTournament);
router.get("/", controller.getTournaments);
router.get("/:id", controller.getTournamentById);
router.patch("/:id/status", controller.updateStatus);
router.get("/:id/participants", controller.getParticipants);

module.exports = router;
