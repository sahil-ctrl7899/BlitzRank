// controllers/user.controller.js
import { User, WalletTransaction } from "../models/index.js";
import walletService from "../services/wallet.service.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const SECRET = process.env.JWT_SECRET || "MYSECRET123";
const ALLOWED_ROLES = ["USER", "ADMIN", "GAME_SERVER"];

class UserController {

    async createUser(req, res) {
        try {
            const { username, password, role } = req.body;

            if (!username || !password) {
                return res.status(400).json({ msg: "Username and password are required" });
            }

            // Default role = USER (never trust client blindly)
            const userRole = role === "ADMIN" || role === "GAME_SERVER"
                ? role
                : "USER";

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                username,
                password: hashedPassword,
                role: userRole,
                balance: 0
            });

            const token = jwt.sign(
                {
                    id: user.id,
                    role: user.role
                },
                SECRET,
                { expiresIn: "1d" }
            );

            res.status(201).json({
                msg: "User created successfully",
                userId: user.id,
                role: user.role,
                token
            });
        } catch (err) {
            res.status(500).json({
                msg: "Failed to create user",
                error: err.message
            });
        }
    }

    async loginUser(req, res) {
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
                {
                    id: user.id,
                    role: user.role
                },
                SECRET,
                { expiresIn: "1d" }
            );

            res.json({
                token,
                role: user.role
            });
        } catch (err) {
            res.status(500).json({
                msg: "Login failed",
                error: err.message
            });
        }
    }

  async getUsers(req, res) {
    try {
      const users = await User.findAll(({
      attributes: ["id", "username", "role", "balance"]
    }));
    res.json(users);
    } catch (err) {
      res.status(500).json({ msg: "Failed to fetch users", error: err.message });
    }
  }

    async getUserById(req, res) {
        try {
            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ msg: "User not found" });
            res.json(user);
        } catch (err) {
            res.status(500).json({ msg: "Failed to fetch user", error: err.message });
        }
    }

    async getBalance(req, res) {
        try {
            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ msg: "User not found" });
            res.json({ balance: user.balance });
        } catch (err) {
            res.status(500).json({ msg: "Failed to fetch balance", error: err.message });
        }
    }

    async creditWallet(req, res) {
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
    }

    async debitWallet(req, res) {
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
    }

    async getWalletTransactions(req, res) {
        try {
            const txns = await WalletTransaction.findAll({
                where: { userId: req.params.id },
                order: [["createdAt", "DESC"]],
            });
            res.json(txns);
        } catch (err) {
            res.status(500).json({ msg: "Failed to fetch transactions", error: err.message });
        }
    }

    async updateUserRole(req, res) {
        try {
            const { id } = req.params;
            const { role } = req.body;

            if (!ALLOWED_ROLES.includes(role)) {
                return res.status(400).json({
                    msg: "Invalid role",
                    allowed: ALLOWED_ROLES
                });
            }

            const user = await User.findByPk(id);

            if (!user) {
                return res.status(404).json({ msg: "User not found" });
            }

            // Prevent admin from demoting themselves
            if (req.user.id === user.id && role !== user.role) {
                return res.status(403).json({
                    msg: "You cannot change your own role"
                });
            }

            user.role = role;
            await user.save();

            return res.json({
                msg: "Role updated successfully",
                userId: user.id,
                newRole: user.role,
                note: "User must re-login for new role to apply"
            });

    } catch (err) {
      res.status(500).json({
        msg: "Failed to update role",
        error: err.message
      });
    }
  }
  
}

export default new UserController();
