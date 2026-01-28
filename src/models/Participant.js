const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Participant = sequelize.define(
  "Participant",
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

    tournamentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    currentScore: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 0
    },

    rank: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: "Participants",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "tournamentId"]
      }
    ]
  }
);

module.exports = Participant;
