// Used only by sequelize-cli (see .sequelizerc). CommonJS on purpose.
require("dotenv").config();

const base = { url: process.env.DATABASE_URL, dialect: "postgres", logging: false };

module.exports = { development: base, test: base, production: base };
