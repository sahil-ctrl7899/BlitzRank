const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const ScoreHistory = sequelize.define(
  "ScoreHistory",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    participantId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    scoreAdded: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false
    }
  },
  {
    tableName: "ScoreHistories",
    timestamps: true
  }
);

module.exports = ScoreHistory;
