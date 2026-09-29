import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { WalletTransaction } from "../models/index.js";
import { AppError, notFound } from "../errors/AppError.js";
import { invalidate, keys } from "../lib/cache.js";

/*
 * Balance changes are single atomic UPDATE statements, so there is no read-modify-write
 * window: two concurrent debits serialize on the row lock and the second one sees the
 * reduced balance. The `balance >= 0` CHECK constraint is a second, database-level guard.
 * Every movement writes an immutable ledger row in the same transaction.
 */

export async function creditTx(t, userId, amount, reason, referenceId = null) {
  const rows = await sequelize.query(
    `UPDATE "Users" SET balance = balance + :amount, "updatedAt" = NOW()
     WHERE id = :userId RETURNING balance`,
    { replacements: { amount, userId }, type: QueryTypes.SELECT, transaction: t }
  );
  if (!rows.length) throw notFound("User not found");
  await WalletTransaction.create({ userId, type: "CREDIT", amount, reason, referenceId }, { transaction: t });
  return rows[0].balance;
}

export async function debitTx(t, userId, amount, reason, referenceId = null) {
  const rows = await sequelize.query(
    `UPDATE "Users" SET balance = balance - :amount, "updatedAt" = NOW()
     WHERE id = :userId AND balance >= :amount RETURNING balance`,
    { replacements: { amount, userId }, type: QueryTypes.SELECT, transaction: t }
  );
  if (!rows.length) {
    const [exists] = await sequelize.query(`SELECT 1 FROM "Users" WHERE id = :userId`, {
      replacements: { userId }, type: QueryTypes.SELECT, transaction: t
    });
    if (!exists) throw notFound("User not found");
    throw new AppError(402, "INSUFFICIENT_FUNDS", "Insufficient balance");
  }
  await WalletTransaction.create({ userId, type: "DEBIT", amount, reason, referenceId }, { transaction: t });
  return rows[0].balance;
}

export const invalidateWalletCaches = (userId) => invalidate(keys.user(userId));

const credit = async (userId, amount, reason) => {
  const balance = await sequelize.transaction((t) => creditTx(t, userId, amount, reason));
  await invalidateWalletCaches(userId);
  return { balance };
};

const debit = async (userId, amount, reason) => {
  const balance = await sequelize.transaction((t) => debitTx(t, userId, amount, reason));
  await invalidateWalletCaches(userId);
  return { balance };
};

const getBalance = async (userId) => {
  const [row] = await sequelize.query(`SELECT balance FROM "Users" WHERE id = :userId`, {
    replacements: { userId }, type: QueryTypes.SELECT
  });
  if (!row) throw notFound("User not found");
  return { balance: row.balance };
};

const transactions = (userId, { limit, offset }) =>
  WalletTransaction.findAndCountAll({
    where: { userId }, order: [["createdAt", "DESC"], ["id", "DESC"]], limit, offset
  });

export default { credit, debit, getBalance, transactions };
