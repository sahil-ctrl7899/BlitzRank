import { Router } from "express";
import * as c from "../controllers/user.controller.js";
import auth from "../middlewares/authmiddleware.js";
import role from "../middlewares/rolemiddleware.js";
import validate from "../middlewares/validate.js";
import { idParam, users as s } from "../validators/schemas.js";

const router = Router();
const admin = [auth, role(["ADMIN"])];

router.get("/", ...admin, validate({ query: s.page }), c.listUsers);
router.get("/:id", auth, validate({ params: idParam }), c.getUser);
router.get("/:id/balance", auth, validate({ params: idParam }), c.getBalance);

router.put("/:id/role", ...admin, validate({ params: idParam, body: s.role }), c.updateRole);
router.post("/:id/credit", ...admin, validate({ params: idParam, body: s.wallet }), c.credit);
router.post("/:id/debit", ...admin, validate({ params: idParam, body: s.wallet }), c.debit);
router.get("/:id/transactions", ...admin, validate({ params: idParam, query: s.page }), c.transactions);

export default router;
