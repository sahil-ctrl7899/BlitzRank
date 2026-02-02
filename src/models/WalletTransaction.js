import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const WalletTransaction = sequelize.define(
  "WalletTransaction",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    type: {
      type: DataTypes.ENUM("CREDIT", "DEBIT"),
      allowNull: false
    },

    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },

    reason: {
      type: DataTypes.STRING,
      allowNull: false
    },

    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: "WalletTransactions",
    timestamps: true
  }
);

export default WalletTransaction;
