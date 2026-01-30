"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      "Participants",
      [
        // Tournament 1
        {
          userId: 9,    // Nitin
          tournamentId: 1,
          currentScore: 120,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          userId: 11,   // Meet
          tournamentId: 1,
          currentScore: 90,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          userId: 14,   // Vivek
          tournamentId: 1,
          currentScore: 150,
          createdAt: new Date(),
          updatedAt: new Date()
        },

        {
          userId: 20,   // mahi
          tournamentId: 2,
          currentScore: 200,
          createdAt: new Date(),
          updatedAt: new Date()
        },

        // Tournament 6 (High stake)
        {
          userId: 25,   // priya
          tournamentId: 6,
          currentScore: 300,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          userId: 9,    // Nitin
          tournamentId: 6,
          currentScore: 180,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      {}
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Participants", null, {});
  }
};
