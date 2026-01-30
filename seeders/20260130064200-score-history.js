"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("ScoreHistories", [

      // participantId = 2 (20)
      { participantId: 2, scoreAdded: 20, createdAt: new Date(), updatedAt: new Date() },

      // participantId = 3 (40)
      { participantId: 3, scoreAdded: 15, createdAt: new Date(), updatedAt: new Date() },
      { participantId: 3, scoreAdded: 25, createdAt: new Date(), updatedAt: new Date() },

      // participantId = 4 (20)
      { participantId: 4, scoreAdded: 20, createdAt: new Date(), updatedAt: new Date() },

      // participantId = 14 (120)
      { participantId: 14, scoreAdded: 50, createdAt: new Date(), updatedAt: new Date() },
      { participantId: 14, scoreAdded: 70, createdAt: new Date(), updatedAt: new Date() },

      // participantId = 15 (90)
      { participantId: 15, scoreAdded: 40, createdAt: new Date(), updatedAt: new Date() },
      { participantId: 15, scoreAdded: 50, createdAt: new Date(), updatedAt: new Date() },

      // participantId = 16 (150)
      { participantId: 16, scoreAdded: 60, createdAt: new Date(), updatedAt: new Date() },
      { participantId: 16, scoreAdded: 90, createdAt: new Date(), updatedAt: new Date() },

      // participantId = 17 (200)
      { participantId: 17, scoreAdded: 100, createdAt: new Date(), updatedAt: new Date() },
      { participantId: 17, scoreAdded: 100, createdAt: new Date(), updatedAt: new Date() },

      // participantId = 18 (300)
      { participantId: 18, scoreAdded: 120, createdAt: new Date(), updatedAt: new Date() },
      { participantId: 18, scoreAdded: 180, createdAt: new Date(), updatedAt: new Date() },

      // participantId = 19 (180)
      { participantId: 19, scoreAdded: 80, createdAt: new Date(), updatedAt: new Date() },
      { participantId: 19, scoreAdded: 100, createdAt: new Date(), updatedAt: new Date() }

    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("ScoreHistories", null, {});
  }
};
