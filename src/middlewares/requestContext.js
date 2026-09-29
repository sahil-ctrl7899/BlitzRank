import { randomUUID } from "node:crypto";
import { requestContext } from "../utils/logger.js";

/** Assigns / propagates X-Request-Id and binds it to every log line emitted while handling the request. */
export default (req, res, next) => {
  const id = /^[\w-]{8,64}$/.test(req.headers["x-request-id"] ?? "") ? req.headers["x-request-id"] : randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  requestContext.run({ requestId: id }, next);
};
