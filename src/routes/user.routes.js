const router = require("express").Router();
const userController = require("../controllers/user.controller");
const auth = require("../middlewares/authmiddleware");
const role = require("../middlewares/rolemiddleware");

// Public
router.post("/signup", userController.createUser);
router.post("/login", userController.loginUser);



// Protected
router.get("/profile", auth, (req, res) => {
    res.json({
        msg: "You are authenticat+d",
        userId: req.userId
    });
});
router.get("/", auth, userController.getUsers);
router.get("/:id", auth, userController.getUserById);
router.get("/:id/balance", auth, userController.getBalance);


// Wallet (ADMIN only)
router.put("/:id/role",auth, role(["ADMIN"]),userController.updateUserRole);
router.post("/:id/credit", auth, role(["ADMIN"]), userController.creditWallet);
router.post("/:id/debit", auth, role(["ADMIN"]), userController.debitWallet);
router.get("/:id/transactions", auth, role(["ADMIN"]), userController.getWalletTransactions);

module.exports = router;