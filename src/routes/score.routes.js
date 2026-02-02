import { Router } from "express";
import controller from "../controllers/score.controller.js";
import auth from "../middlewares/authmiddleware.js";
import role from "../middlewares/rolemiddleware.js";

const router = Router();

router.post("/submit",auth, role(["ADMIN", "GAME_SERVER"]),controller.submitScore);
// router.post("/play", auth, role(["USER"]), controller.playGame);
router.get("/history/:participantId", auth,role(["ADMIN"]),controller.getScoreHistory);

export default router;
