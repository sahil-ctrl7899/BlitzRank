import { Router } from "express";
import * as c from "../controllers/score.controller.js";
import auth from "../middlewares/authmiddleware.js";
import role from "../middlewares/rolemiddleware.js";
import validate from "../middlewares/validate.js";
import rateLimit from "../middlewares/rateLimit.js";
import { score as s } from "../validators/schemas.js";

const router = Router();

// Game servers are high volume: generous limit, keyed by the authenticated caller, not the IP.
const submitLimiter = rateLimit({ name: "score", capacity: 500, refillPerSec: 250, keyFn: (req) => `u${req.user.id}` });

router.post("/submit", auth, role(["ADMIN", "GAME_SERVER"]), submitLimiter, validate({ body: s.submit }), c.submitScore);
router.get("/history/:participantId", auth, role(["ADMIN"]), validate({ params: s.historyParams, query: s.page }), c.history);

export default router;
