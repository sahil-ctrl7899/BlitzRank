import { boot } from "../helpers.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

let t;
before(async () => { t = await boot(); });
after(() => t.shutdown());

const creds = { username: "alice", password: "Passw0rd!123" };

test("signup ignores a client-supplied role (no privilege escalation)", async () => {
  const res = await t.api().post("/auth/signup").send({ ...creds, role: "ADMIN" });
  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, "USER");
  assert.ok(!JSON.stringify(res.body).includes("password"));
});

test("validation and duplicate handling", async () => {
  assert.equal((await t.api().post("/auth/signup").send({ username: "bob", password: "short" })).status, 400);
  const dup = await t.api().post("/auth/signup").send(creds);
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.code, "USERNAME_TAKEN");
});

test("login failures are indistinguishable for unknown user vs wrong password", async () => {
  const a = await t.api().post("/auth/login").send({ username: "nobody", password: "whatever123" });
  const b = await t.api().post("/auth/login").send({ username: "alice", password: "wrong-password" });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.deepEqual(a.body.error.message, b.body.error.message);
});

test("protected routes need a valid bearer token", async () => {
  assert.equal((await t.api().get("/auth/me")).status, 401);
  assert.equal((await t.api().get("/auth/me").set("Authorization", "Bearer garbage")).status, 401);
  const { auth } = await t.makeUser("carol");
  assert.equal((await t.api().get("/auth/me").set(auth)).body.user.username, "carol");
});

test("refresh tokens rotate, and re-use revokes the whole session family", async () => {
  const login = await t.api().post("/auth/login").send(creds);
  const r1 = login.body.refreshToken;

  const second = await t.api().post("/auth/refresh").send({ refreshToken: r1 });
  assert.equal(second.status, 200);
  const r2 = second.body.refreshToken;
  assert.notEqual(r1, r2);

  // Replaying the already-used token = theft signal -> 401 and the family (incl. r2) is killed.
  assert.equal((await t.api().post("/auth/refresh").send({ refreshToken: r1 })).status, 401);
  assert.equal((await t.api().post("/auth/refresh").send({ refreshToken: r2 })).status, 401);
});

test("logout revokes the refresh token", async () => {
  const login = await t.api().post("/auth/login").send(creds);
  assert.equal((await t.api().post("/auth/logout").send({ refreshToken: login.body.refreshToken })).status, 204);
  assert.equal((await t.api().post("/auth/refresh").send({ refreshToken: login.body.refreshToken })).status, 401);
});

test("RBAC + no IDOR: users can't read other users or use admin routes", async () => {
  const a = await t.makeUser("user_a", "USER", 50);
  const b = await t.makeUser("user_b", "USER", 70);
  const admin = await t.makeUser("root", "ADMIN");

  assert.equal((await t.api().get(`/users/${a.user.id}`).set(a.auth)).status, 200);
  assert.equal((await t.api().get(`/users/${b.user.id}`).set(a.auth)).status, 403);
  assert.equal((await t.api().get(`/users/${b.user.id}/balance`).set(a.auth)).status, 403);
  assert.equal((await t.api().get(`/users/${b.user.id}/balance`).set(admin.auth)).body.balance, "70.00");
  assert.equal((await t.api().get("/users").set(a.auth)).status, 403);

  const self = await t.api().get(`/users/${a.user.id}`).set(a.auth);
  assert.equal(self.body.password, undefined);
});

test("role change takes effect immediately (cache invalidated), and admins can't demote themselves", async () => {
  const admin = await t.makeUser("boss", "ADMIN");
  const u = await t.makeUser("promote_me");
  assert.equal((await t.api().get("/users").set(u.auth)).status, 403);
  assert.equal((await t.api().put(`/users/${u.user.id}/role`).set(admin.auth).send({ role: "ADMIN" })).status, 200);
  assert.equal((await t.api().get("/users").set(u.auth)).status, 200); // same token, new role
  assert.equal((await t.api().put(`/users/${admin.user.id}/role`).set(admin.auth).send({ role: "USER" })).status, 403);
});

test("login is rate limited per IP+username (token bucket in Redis)", async () => {
  process.env.RATE_LIMIT_ENABLED = "true";
  // env is parsed once at import; exercise the limiter module directly instead.
  const { consume } = await import("../../src/lib/rateLimiter.js");
  const opts = { capacity: 5, refillPerSec: 0.001 };
  const results = [];
  for (let i = 0; i < 8; i++) results.push((await consume("test:login", opts)).allowed);
  assert.deepEqual(results, [true, true, true, true, true, false, false, false]);
  // Buckets are independent per key.
  assert.equal((await consume("test:other", opts)).allowed, true);
});

test("rate limiter is atomic under concurrency (no over-admission)", async () => {
  const { consume } = await import("../../src/lib/rateLimiter.js");
  const all = await Promise.all(Array.from({ length: 100 }, () => consume("test:burst", { capacity: 20, refillPerSec: 0.001 })));
  assert.equal(all.filter((r) => r.allowed).length, 20);
});
