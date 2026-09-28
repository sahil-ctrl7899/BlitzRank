module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Tournaments", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false
      },

      entryFee: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },

      startTime: {
        type: Sequelize.DATE,
        allowNull: false
      },

      endTime: {
        type: Sequelize.DATE,
        allowNull: false
      },

      status: {
        type: Sequelize.ENUM("OPEN", "ACTIVE", "COMPLETED"),
        allowNull: false,
        defaultValue: "OPEN"
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("Tournaments");
  }
};
