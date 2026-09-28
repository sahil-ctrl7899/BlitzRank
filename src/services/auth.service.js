import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { UniqueConstraintError } from "sequelize";
import { User } from "../models/index.js";
import { redis } from "../config/redis.js";
import { env, isTest } from "../config/env.js";
import { conflict, unauthorized } from "../errors/AppError.js";
import { invalidate, keys } from "../lib/cache.js";

const BCRYPT_COST = isTest ? 4 : 12;
const REFRESH_TTL = env.REFRESH_TOKEN_TTL_DAYS * 24 * 3600;
// Compared against when the username is unknown, so response time doesn't reveal which usernames exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

const sha256 = (v) => createHash("sha256").update(v).digest("hex");

const signAccess = (user) =>
  jwt.sign({ role: user.role }, env.JWT_SECRET, {
    algorithm: "HS256", subject: String(user.id), expiresIn: env.ACCESS_TOKEN_TTL
  });

export const verifyAccess = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });

/*
 * Refresh tokens are opaque, stored only as SHA-256 hashes in Redis, and rotated on every use.
 * Each login starts a "family". Presenting an already-rotated token means it was stolen
 * (or replayed) -> the whole family is revoked and the user must log in again.
 */
async function issueRefresh(userId, family = randomUUID()) {
  const raw = randomBytes(32).toString("base64url");
  const hash = sha256(raw);
  await redis
    .multi()
    .set(`rt:${hash}`, JSON.stringify({ userId, family }), "EX", REFRESH_TTL)
    .sadd(`rtf:${family}`, hash)
    .expire(`rtf:${family}`, REFRESH_TTL)
    .exec();
  return raw;
}

async function revokeFamily(family) {
  const hashes = await redis.smembers(`rtf:${family}`);
  const pipe = redis.multi();
  hashes.forEach((h) => pipe.del(`rt:${h}`));
  pipe.del(`rtf:${family}`);
  await pipe.exec();
}

const tokenPair = async (user, family) => ({
  accessToken: signAccess(user),
  refreshToken: await issueRefresh(user.id, family),
  tokenType: "Bearer",
  expiresIn: env.ACCESS_TOKEN_TTL
});

const publicUser = (u) => ({ id: u.id, username: u.username, role: u.role });

async function register({ username, password }) {
  const hash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    // Role is never client-controlled: public signup always yields a USER.
    const user = await User.create({ username, password: hash, role: "USER", balance: 0 });
    return { user: publicUser(user), ...(await tokenPair(user)) };
  } catch (err) {
    if (err instanceof UniqueConstraintError) throw conflict("Username already taken", "USERNAME_TAKEN");
    throw err;
  }
}

async function login({ username, password }) {
  const user = await User.findOne({ where: { username } });
  const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !ok) throw unauthorized("Invalid credentials");
  return { user: publicUser(user), ...(await tokenPair(user)) };
}

async function refresh(rawToken) {
  const hash = sha256(rawToken);
  const stored = await redis.getdel(`rt:${hash}`); // atomic: only one caller can consume a token
  if (!stored) {
    const family = await redis.get(`rt:used:${hash}`);
    if (family) await revokeFamily(family); // reuse detected
    throw unauthorized("Invalid refresh token");
  }
  const { userId, family } = JSON.parse(stored);
  await redis.multi().set(`rt:used:${hash}`, family, "EX", REFRESH_TTL).srem(`rtf:${family}`, hash).exec();

  const user = await User.findByPk(userId);
  if (!user) throw unauthorized("Invalid refresh token");
  return { user: publicUser(user), ...(await tokenPair(user, family)) };
}

async function logout(rawToken) {
  const hash = sha256(rawToken);
  const stored = await redis.get(`rt:${hash}`);
  if (stored) await revokeFamily(JSON.parse(stored).family);
}

async function setRole(userId, role) {
  const [count] = await User.update({ role }, { where: { id: userId } });
  await invalidate(keys.authUser(userId), keys.user(userId));
  return count > 0;
}

export default { register, login, refresh, logout, setRole };
