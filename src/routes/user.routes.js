const router= require("express").Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/authmiddleware")

router.post("/signup",userController.createUser);
router.post("/login",userController.loginUser);

router.get("/profile", authMiddleware , (req, res) => {
  res.json({
    msg: "You are authenticated",
    userId: req.userId
  });
});
router.get("/", authMiddleware ,userController.getUsers);
router.get("/:id", authMiddleware ,userController.getUserById);
router.get("/:id/balance", authMiddleware ,userController.getBalance);

router.post("/:id/credit", authMiddleware, userController.creditWallet);
router.post("/:id/debit", authMiddleware, userController.debitWallet);
router.get("/:id/transactions", authMiddleware, userController.getWalletTransactions);

module.exports=router;