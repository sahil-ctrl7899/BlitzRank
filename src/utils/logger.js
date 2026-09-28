import winston from "winston";
import { AsyncLocalStorage } from "node:async_hooks";

/** Per-request context (requestId, userId) available anywhere without threading params. */
export const requestContext = new AsyncLocalStorage();

const withContext = winston.format((info) => {
  const ctx = requestContext.getStore();
  if (ctx) Object.assign(info, ctx);
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  silent: process.env.NODE_ENV === "test" && process.env.LOG_LEVEL === undefined,
  format: winston.format.combine(
    withContext(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  // Stdout only: containers ship logs; files inside them just fill the disk.
  transports: [new winston.transports.Console()]
});

export default logger;
