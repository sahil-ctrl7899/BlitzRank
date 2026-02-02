import { sequelize } from "../config/db.js";
import { User, WalletTransaction } from "../models/index.js";

const credit = async (userId, amount, reason) => {
  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) throw new Error("User not found");

    user.balance = Number(user.balance) + Number(amount);
    await user.save({ transaction: t });

    await WalletTransaction.create(
      {
        userId,
        type: "CREDIT",
        amount,
        reason
      },
      { transaction: t }
    );

    return { balance: user.balance };
  });
};

const debit = async (userId, amount, reason) => {
  return sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) throw new Error("User not found");

    if (Number(user.balance) < Number(amount)) {
      throw new Error("Insufficient balance");
    }

    user.balance = Number(user.balance) - Number(amount);
    await user.save({ transaction: t });

    await WalletTransaction.create(
      {
        userId,
        type: "DEBIT",
        amount,
        reason
      },
      { transaction: t }
    );

    return { balance: user.balance };
  });
};

export default { credit, debit };

