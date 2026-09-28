/** Operational errors carry an HTTP status + machine readable code; everything else is a 500. */
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new AppError(400, "BAD_REQUEST", msg, details);
export const unauthorized = (msg = "Unauthorized") => new AppError(401, "UNAUTHORIZED", msg);
export const forbidden = (msg = "Access denied") => new AppError(403, "FORBIDDEN", msg);
export const notFound = (msg = "Not found") => new AppError(404, "NOT_FOUND", msg);
export const conflict = (msg, code = "CONFLICT") => new AppError(409, code, msg);
export const tooMany = (msg = "Too many requests") => new AppError(429, "RATE_LIMITED", msg);
