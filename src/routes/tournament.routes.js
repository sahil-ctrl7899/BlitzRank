const router = require("express").Router();
const controller = require("../controllers/tournament.controller");
const auth = require("../middlewares/authmiddleware");
const role = require("../middlewares/rolemiddleware");

// PUBLIC (READ-ONLY)

router.get("/", controller.getTournaments);
router.get("/:id", controller.getTournamentById);
router.get("/:id/participants", controller.getParticipants);

// ADMIN ONLY
// Create tournament
router.post(
    "/",
    auth,
    role(["ADMIN"]),
    controller.createTournament
);

// Change tournament status (OPEN → ACTIVE → COMPLETED)
router.patch(
    "/:id/status",
    auth,
    role(["ADMIN"]),
    controller.updateStatus
);

// Remove participant + refund
router.delete(
    "/:id/participants/:userId",
    auth,
    role(["ADMIN"]),
    controller.removeParticipant
);

// USER ONLY
// Join tournament (money transaction)
router.post(
    "/:id/join",
    auth,
    role(["USER"]),
    controller.joinTournament
);

module.exports = router;
