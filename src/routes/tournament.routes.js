import { Router } from "express";
import * as c from "../controllers/tournament.controller.js";
import auth from "../middlewares/authmiddleware.js";
import role from "../middlewares/rolemiddleware.js";
import validate from "../middlewares/validate.js";
import { idParam, tournaments as s } from "../validators/schemas.js";

const router = Router();

// Public
router.get("/", validate({ query: s.list }), c.list);
router.get("/:id", validate({ params: idParam }), c.getById);
router.get("/:id/participants", validate({ params: idParam }), c.participants);
router.get("/:id/payouts", validate({ params: idParam }), c.payouts);

// Admin
router.post("/", auth, role(["ADMIN"]), validate({ body: s.create }), c.create);
router.patch("/:id/status", auth, role(["ADMIN"]), validate({ params: idParam, body: s.status }), c.updateStatus);
router.delete("/:id/participants/:userId", auth, role(["ADMIN"]), validate({ params: s.removeParams }), c.removeParticipant);

// Player
router.post("/:id/join", auth, role(["USER"]), validate({ params: idParam }), c.join);

export default router;
