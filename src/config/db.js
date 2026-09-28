import { Sequelize } from "sequelize";
import { env, isProd } from "./env.js";
import logger from "../utils/logger.js";

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  pool: { max: env.DB_POOL_MAX, min: 2, acquire: 10_000, idle: 10_000 },
  dialectOptions: isProd && process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: false } } : {},
  // Default isolation is READ COMMITTED; money paths add row locks / atomic SQL explicitly.
  // NB: no `retry` option. It re-runs a failed *query* inside an already-aborted transaction,
  // which masks the real error. Lock ordering is what prevents deadlocks here.
});

export const connectDB = async () => {
  await sequelize.authenticate();
  logger.info("postgres connected");
};
