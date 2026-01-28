module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Participants", {
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

      tournamentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Tournaments",
          key: "id"
        },
        onDelete: "CASCADE"
      },

      currentScore: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0
      },

      rank: {
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

    // Prevent duplicate joins
    await queryInterface.addConstraint("Participants", {
      fields: ["userId", "tournamentId"],
      type: "unique",
      name: "unique_user_tournament"
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("Participants");
  }
};
