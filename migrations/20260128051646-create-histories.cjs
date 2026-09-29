module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ScoreHistories", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      participantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Participants",
          key: "id"
        },
        onDelete: "CASCADE"
      },

      scoreAdded: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: false
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
    await queryInterface.dropTable("ScoreHistories");
  }
};
