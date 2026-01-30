const router = require("express").Router();
const scoreController = require("../controllers/score.controller");
const auth = require("../middleware/authmiddleware");

router.post("/submit", auth, scoreController.submitScore);

module.exports = router;
