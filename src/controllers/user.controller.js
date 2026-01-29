const { User, WalletTransaction } = require("../models");
const walletService = require("../services/wallet.service");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const SECRET = process.env.JWT_SECRET;

exports.createUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ msg: "Username and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      balance: 0
    });

    const token = jwt.sign(
    { userId: user.id },
    SECRET,
    { expiresIn: "1d" }
    );

    res.status(201).json({
      msg: "User created successfully",
      userId: user.id,
      token
    });
  } catch (err) {
    res.status(500).json({ msg: "Failed to create user", error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ msg: "Invalid password" });
    }

    const token = jwt.sign(
      { userId: user.id },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ msg: "Login failed", error: err.message });
  }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (err) {
        res.status(500).json({ msg: "Failed to fetch users", error: err.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: "Failed to fetch user", error: err.message });
    }
};

exports.getBalance = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ msg: "User not found" });
        res.json({ balance: user.balance });
    } catch (err) {
        res.status(500).json({ msg: "Failed to fetch balance", error: err.message });
    }
};

exports.creditWallet = async (req, res) => {
    try {
        const { amount, reason = "ADMIN_CREDIT" } = req.body || {};
        if (!amount || amount <= 0) {
            return res.status(400).json({ msg: "Valid amount is required" });
        }

        const result = await walletService.credit(req.params.id, amount, reason);
        res.json(result);
    } catch (err) {
        res.status(400).json({ msg: err.message || "Credit failed" });
    }
};

exports.debitWallet = async (req, res) => {
    try {
        const { amount, reason = "ADMIN_DEBIT" } = req.body || {};
        if (!amount || amount <= 0) {
            return res.status(400).json({ msg: "Valid amount is required" });
        }

        const result = await walletService.debit(req.params.id, amount, reason);
        res.json(result);
    } catch (err) {
        res.status(400).json({ msg: err.message || "Debit failed" });
    }
};

exports.getWalletTransactions = async (req, res) => {
    try {
        const txns = await WalletTransaction.findAll({
            where: { userId: req.params.id },
            order: [["createdAt", "DESC"]],
        });
        res.json(txns);
    } catch (err) {
        res.status(500).json({ msg: "Failed to fetch transactions", error: err.message });
    }
};
