
const router = require("express").Router();
const controller = require("../controllers/score.controller");
const auth = require("../middlewares/authmiddleware");
const role = require("../middlewares/rolemiddleware");


router.post("/submit", auth, role(["ADMIN","GAME_SERVER"]), controller.submitScore);
router.get("/history/:participantId", auth, role(["ADMIN"]), controller.getScoreHistory);

module.exports = router;
