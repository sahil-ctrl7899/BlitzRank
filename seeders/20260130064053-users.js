"use strict";
const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert("Users", [
      // ADMIN
      {
        username: "admin",
        password: await bcrypt.hash("admin123", 10),
        role: "ADMIN",
        balance: 0,
        createdAt: now,
        updatedAt: now
      },

      // GAME SERVER
      {
        username: "game_server",
        password: await bcrypt.hash("server123", 10),
        role: "GAME_SERVER",
        balance: 0,
        createdAt: now,
        updatedAt: now
      },

      // USERS
      {
        username: "mahi",
        password: await bcrypt.hash("user123", 10),
        role: "USER",
        balance: 1500,
        createdAt: now,
        updatedAt: now
      },
      {
        username: "rahul",
        password: await bcrypt.hash("user123", 10),
        role: "USER",
        balance: 800,
        createdAt: now,
        updatedAt: now
      },
      {
        username: "rohit",
        password: await bcrypt.hash("user123", 10),
        role: "USER",
        balance: 1200,
        createdAt: now,
        updatedAt: now
      },
      {
        username: "vansh",
        password: await bcrypt.hash("user123", 10),
        role: "USER",
        balance: 500,
        createdAt: now,
        updatedAt: now
      },
      {
        username: "ananya",
        password: await bcrypt.hash("user123", 10),
        role: "USER",
        balance: 950,
        createdAt: now,
        updatedAt: now
      },
      {
        username: "priya",
        password: await bcrypt.hash("user123", 10),
        role: "USER",
        balance: 1100,
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Users", null, {});
  }
};
