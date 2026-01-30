module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Users", "role", {
      type: Sequelize.ENUM("USER", "ADMIN", "GAME_SERVER"),
      allowNull: false,
      defaultValue: "USER"
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("Users", "role");

    // IMPORTANT: remove ENUM type in Postgres
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Users_role";'
    );
  }
};
