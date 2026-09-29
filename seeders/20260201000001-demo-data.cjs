"use strict";
const bcrypt = require("bcrypt");

/**
 * Demo dataset, deterministic and relative to "now" so tournaments are always in a sensible state.
 * IDs are looked up by name instead of hardcoded, so it works on any database.
 * All seeded accounts use the password: Passw0rd!123
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const hour = 3600 * 1000;
    const password = await bcrypt.hash("Passw0rd!123", 10);

    const users = [
      { username: "admin", role: "ADMIN", balance: 0 },
      { username: "game_server", role: "GAME_SERVER", balance: 0 },
      ...["mahi", "rahul", "rohit", "vansh", "ananya", "priya"].map((username) => ({ username, role: "USER", balance: 500 }))
    ].map((u) => ({ ...u, password, createdAt: now, updatedAt: now }));
    await queryInterface.bulkInsert("Users", users);

    await queryInterface.bulkInsert("Tournaments", [
      { name: "Open Blitz", entryFee: 10, status: "OPEN", startTime: new Date(+now + 24 * hour), endTime: new Date(+now + 72 * hour), createdAt: now, updatedAt: now },
      { name: "Weekend Smash", entryFee: 20, status: "ACTIVE", startTime: new Date(+now - 24 * hour), endTime: new Date(+now + 48 * hour), createdAt: now, updatedAt: now }
    ]);

    const sql = queryInterface.sequelize;
    const [rows] = await sql.query(`SELECT id, username FROM "Users" WHERE role = 'USER' ORDER BY id`);
    const [[active]] = await sql.query(`SELECT id FROM "Tournaments" WHERE name = 'Weekend Smash' ORDER BY id DESC LIMIT 1`);
    await queryInterface.bulkInsert("Participants", rows.slice(0, 4).map((u, i) => ({
      userId: u.id, tournamentId: active.id, currentScore: (4 - i) * 12.5, createdAt: now, updatedAt: now
    })));
    await sql.query(`UPDATE "Tournaments" SET "prizePool" = 20 * 4 WHERE id = :id`, { replacements: { id: active.id } });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Participants", null, {});
    await queryInterface.bulkDelete("Tournaments", null, {});
    await queryInterface.bulkDelete("Users", null, {});
  }
};
