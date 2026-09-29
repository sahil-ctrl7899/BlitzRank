import { ZodError } from "zod";
import { ValidationError, UniqueConstraintError, ForeignKeyConstraintError, DatabaseError } from "sequelize";
import { AppError } from "../errors/AppError.js";
import logger from "../utils/logger.js";
import { isProd } from "../config/env.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` } });
};

// eslint-disable-next-line no-unused-vars
export default (err, req, res, _next) => {
  let status = 500, code = "INTERNAL_ERROR", message = "Internal server error", details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400; code = "VALIDATION_ERROR"; message = "Request validation failed";
    details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (err instanceof UniqueConstraintError) {
    status = 409; code = "CONFLICT"; message = "Resource already exists";
  } else if (err instanceof ForeignKeyConstraintError) {
    status = 409; code = "CONFLICT"; message = "Referenced resource does not exist";
  } else if (err instanceof ValidationError) {
    status = 400; code = "VALIDATION_ERROR"; message = err.message;
  } else if (err?.type === "entity.parse.failed") {
    status = 400; code = "BAD_JSON"; message = "Malformed JSON body";
  } else if (err?.type === "entity.too.large") {
    status = 413; code = "PAYLOAD_TOO_LARGE"; message = "Payload too large";
  } else if (err instanceof DatabaseError && /violates check constraint/.test(err.message)) {
    status = 409; code = "CONSTRAINT_VIOLATION"; message = "Operation violates a data integrity rule";
  }

  if (status >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl, method: req.method });
    if (isProd) message = "Internal server error";
    else message = err.message;
  }

  res.status(status).json({ error: { code, message, details, requestId: req.id } });
};
