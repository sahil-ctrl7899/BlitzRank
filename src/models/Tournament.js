import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Tournament = sequelize.define(
  "Tournament",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    entryFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },

    startTime: {
      type: DataTypes.DATE,
      allowNull: false
    },

    endTime: {
      type: DataTypes.DATE,
      allowNull: false
    },

    status: {
      type: DataTypes.ENUM("OPEN", "ACTIVE", "COMPLETED"),
      allowNull: false,
      defaultValue: "OPEN"
    },

    // Sum of entry fees currently held; maintained atomically on join / removal.
    prizePool: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },

    payoutStatus: {
      type: DataTypes.ENUM("PENDING", "PROCESSING", "DONE"),
      allowNull: false,
      defaultValue: "PENDING"
    }
  },
  {
    tableName: "Tournaments",
    timestamps: true
  }
);

export default Tournament;
