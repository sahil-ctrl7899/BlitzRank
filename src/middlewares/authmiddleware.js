import { User } from "../models/index.js";
import { verifyAccess } from "../services/auth.service.js";
import { cached, keys } from "../lib/cache.js";
import { unauthorized } from "../errors/AppError.js";
import { requestContext } from "../utils/logger.js";

/**
 * Stateless JWT verification + a 60s cached lookup of the user's *current* role.
 * That keeps role changes effective immediately (cache is invalidated on change) without
 * a Postgres round trip on every request.
 */
export default async function auth(req, _res, next) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw unauthorized("Missing bearer token");

  let payload;
  try {
    payload = verifyAccess(token);
  } catch {
    throw unauthorized("Invalid or expired token");
  }

  const user = await cached(keys.authUser(payload.sub), 60, () =>
    User.findByPk(payload.sub, { attributes: ["id", "username", "role"], raw: true })
  );
  if (!user) throw unauthorized("User no longer exists");

  req.user = user;
  req.userId = user.id;
  const ctx = requestContext.getStore();
  if (ctx) ctx.userId = user.id;
  next();
}
