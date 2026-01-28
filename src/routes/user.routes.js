const router= require("express").Router();
const userController = require("../controllers/user.controller");

router.post("/",userController.createUser);
router.get("/",userController.getUsers);
router.get("/:id",userController.getUserById);
router.get("/:id/balance",userController.getBalance);

router.post("/:id/credit",userController.creditWallet);
router.post("/:id/debit",userController.debitWallet);
router.get("/:id/transactions",userController.getWalletTransactions);

module.exports=router;