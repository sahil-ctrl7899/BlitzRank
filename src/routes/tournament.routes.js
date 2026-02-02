import { Router } from "express";
import controller from "../controllers/tournament.controller.js";
import auth from "../middlewares/authmiddleware.js";
import role from "../middlewares/rolemiddleware.js";

const router = Router();

// PUBLIC
router.get("/", controller.getTournaments);
router.get("/:id", controller.getTournamentById);
router.get("/:id/participants", controller.getParticipants);

// ADMIN
router.post("/", auth, role(["ADMIN"]), controller.createTournament);
router.patch("/:id/status", auth, role(["ADMIN"]), controller.updateStatus);
router.delete("/:id/participants/:userId", auth, role(["ADMIN"]), controller.removeParticipant);

// USER
router.post("/:id/join", auth, role(["USER"]), controller.joinTournament);

export default router;

