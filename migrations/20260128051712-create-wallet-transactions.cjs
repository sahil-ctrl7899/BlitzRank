module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("WalletTransactions", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onDelete: "CASCADE"
      },

      type: {
        type: Sequelize.ENUM("CREDIT", "DEBIT"),
        allowNull: false
      },

      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },

      reason: {
        type: Sequelize.STRING,
        allowNull: false
      },

      referenceId: {
        type: Sequelize.INTEGER,
        allowNull: true
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
    await queryInterface.dropTable("WalletTransactions");
  }
};
