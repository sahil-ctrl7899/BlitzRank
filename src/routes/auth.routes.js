import { Router } from "express";
import * as c from "../controllers/auth.controller.js";
import auth from "../middlewares/authmiddleware.js";
import validate from "../middlewares/validate.js";
import rateLimit from "../middlewares/rateLimit.js";
import { auth as s } from "../validators/schemas.js";

const router = Router();

// Brute-force protection: 5 attempts burst, then 1 per 12s, per IP + username.
const loginLimiter = rateLimit({
  name: "login", capacity: 5, refillPerSec: 1 / 12,
  keyFn: (req) => `${req.ip}:${String(req.body?.username ?? "").toLowerCase().slice(0, 64)}`
});
const signupLimiter = rateLimit({ name: "signup", capacity: 5, refillPerSec: 1 / 60 });

router.post("/signup", signupLimiter, validate({ body: s.credentials }), c.signup);
router.post("/login", loginLimiter, validate({ body: s.login }), c.login);
router.post("/refresh", validate({ body: s.refresh }), c.refresh);
router.post("/logout", validate({ body: s.refresh }), c.logout);
router.get("/me", auth, c.me);

export default router;
