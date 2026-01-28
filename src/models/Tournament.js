const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

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
    }
  },
  {
    tableName: "Tournaments",
    timestamps: true
  }
);

module.exports = Tournament;
