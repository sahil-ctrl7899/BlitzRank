const router = require("express").Router();
const controller = require("../controllers/tournament.controller");

router.post("/", controller.createTournament);
router.get("/", controller.getTournaments);
router.get("/:id", controller.getTournamentById);
router.patch("/:id/status", controller.updateStatus);
router.get("/:id/participants", controller.getParticipants);

// For making rules POST /tournaments/:id/join

// User exists
// Tournament exists
// Tournament status = OPEN
// User has enough balance
// User is NOT already joined
// Balance deduction + participant insert = atomic
// Wallet transaction must be logged
router.post("/:id/join", controller.joinTournament);




module.exports = router;
