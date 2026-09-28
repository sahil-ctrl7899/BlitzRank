import { User } from "../models/index.js";
import walletService from "../services/wallet.service.js";
import authService from "../services/auth.service.js";
import { cached, keys } from "../lib/cache.js";
import { forbidden, notFound } from "../errors/AppError.js";

/** Users may read their own record; only admins may read anyone else's (no IDOR). */
export const assertSelfOrAdmin = (req) => {
  if (req.user.role !== "ADMIN" && req.user.id !== Number(req.params.id)) throw forbidden();
};

export const listUsers = async (req, res) => {
  const { limit, offset } = req.valid.query;
  const { rows, count } = await User.findAndCountAll({
    attributes: ["id", "username", "role", "balance"], order: [["id", "ASC"]], limit, offset, raw: true
  });
  res.json({ total: count, limit, offset, users: rows });
};

export const getUser = async (req, res) => {
  assertSelfOrAdmin(req);
  const id = req.valid.params.id;
  // Explicit attribute list: the password hash must never reach a response or the cache.
  const user = await cached(keys.user(id), 60, () =>
    User.findByPk(id, { attributes: ["id", "username", "role", "balance", "createdAt"], raw: true })
  );
  if (!user) throw notFound("User not found");
  res.json(user);
};

// Balances are money: always read from Postgres, never from a cache that can be stale.
export const getBalance = async (req, res) => {
  assertSelfOrAdmin(req);
  res.json(await walletService.getBalance(req.valid.params.id));
};

export const credit = async (req, res) => {
  const { amount, reason = "ADMIN_CREDIT" } = req.valid.body;
  res.json(await walletService.credit(req.valid.params.id, amount, reason));
};

export const debit = async (req, res) => {
  const { amount, reason = "ADMIN_DEBIT" } = req.valid.body;
  res.json(await walletService.debit(req.valid.params.id, amount, reason));
};

export const transactions = async (req, res) => {
  const { rows, count } = await walletService.transactions(req.valid.params.id, req.valid.query);
  res.json({ total: count, ...req.valid.query, transactions: rows });
};

export const updateRole = async (req, res) => {
  const { id } = req.valid.params;
  if (req.user.id === id) throw forbidden("You cannot change your own role");
  if (!(await authService.setRole(id, req.valid.body.role))) throw notFound("User not found");
  res.json({ userId: id, newRole: req.valid.body.role });
};
