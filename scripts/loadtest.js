// Minimal dependency-free load generator.
//   BASE_URL=http://localhost:3000 DURATION=10 CONCURRENCY=64 node scripts/loadtest.js
// Prereq: seeded DB (npm run db:seed) and the API started with RATE_LIMIT_ENABLED=false.
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DURATION = Number(process.env.DURATION ?? 10) * 1000;
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 64);
const PASSWORD = "Passw0rd!123";

const call = async (path, { method = "GET", token, body, headers = {} } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }), ...headers },
    body: body && JSON.stringify(body)
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};
const login = async (username) => (await call("/auth/login", { method: "POST", body: { username, password: PASSWORD } })).json.accessToken;

async function scenario(name, fn) {
  const latencies = [];
  let errors = 0;
  const end = Date.now() + DURATION;
  let n = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (Date.now() < end) {
      const t0 = performance.now();
      try {
        const r = await fn(n++);
        if (r.status >= 400) errors++;
      } catch { errors++; }
      latencies.push(performance.now() - t0);
    }
  }));
  latencies.sort((a, b) => a - b);
  const q = (p) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))].toFixed(1);
  console.log(
    `${name.padEnd(28)} ${(latencies.length / (DURATION / 1000)).toFixed(0).padStart(6)} req/s | ` +
    `p50 ${q(0.5).padStart(6)}ms  p95 ${q(0.95).padStart(6)}ms  p99 ${q(0.99).padStart(6)}ms | errors ${errors}`
  );
}

const [gs, viewer] = await Promise.all([login("game_server"), login("mahi")]);
const active = (await call("/tournaments?status=ACTIVE")).json[0];
if (!active) throw new Error("no ACTIVE tournament; run `npm run db:seed`");
const players = (await call(`/leaderboard/${active.id}/top/10`, { token: viewer })).json.players;
console.log(`target: ${BASE}  tournament ${active.id} (${players.length} players)  concurrency ${CONCURRENCY}  ${DURATION / 1000}s each\n`);

const runId = Date.now().toString(36);
await scenario("GET rank (Redis ZREVRANK)", (i) =>
  call(`/leaderboard/${active.id}/user/${players[i % players.length].userId}`, { token: viewer }));
await scenario("GET top 10", () => call(`/leaderboard/${active.id}/top/10`, { token: viewer }));
await scenario("GET tournaments (cached)", () => call("/tournaments"));
await scenario("POST score/submit (write path)", (i) =>
  call("/score/submit", {
    method: "POST", token: gs, headers: { "Idempotency-Key": `lt-${runId}-${i}` },
    body: { userId: players[i % players.length].userId, tournamentId: active.id, betAmount: 10, winAmount: 12 }
  }));
