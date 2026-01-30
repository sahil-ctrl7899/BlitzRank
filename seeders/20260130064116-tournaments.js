"use strict";

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert("Tournaments", [
      {
        name: "January Blitz",
        entryFee: 10,
        status: "OPEN",
        startTime: new Date("2026-01-30T10:00:00Z"),
        endTime: new Date("2026-02-02T10:00:00Z"),
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Weekend Smash",
        entryFee: 20,
        status: "ACTIVE",
        startTime: new Date("2026-01-27T10:00:00Z"),
        endTime: new Date("2026-01-31T10:00:00Z"),
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Mega Jackpot",
        entryFee: 50,
        status: "COMPLETED",
        startTime: new Date("2026-01-20T10:00:00Z"),
        endTime: new Date("2026-01-25T10:00:00Z"),
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Tournaments", null, {});
  }
};
