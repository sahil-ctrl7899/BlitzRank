import client from "prom-client";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry]
});

export const cacheEvents = new client.Counter({
  name: "cache_events_total",
  help: "Cache hits / misses",
  labelNames: ["result"],
  registers: [registry]
});

export const rateLimited = new client.Counter({
  name: "rate_limited_requests_total",
  help: "Requests rejected by the rate limiter",
  labelNames: ["policy"],
  registers: [registry]
});

export const jobsProcessed = new client.Counter({
  name: "queue_jobs_total",
  help: "Background jobs by queue and outcome",
  labelNames: ["queue", "outcome"],
  registers: [registry]
});

export const scoreSubmissions = new client.Counter({
  name: "score_submissions_total",
  help: "Score submissions by outcome",
  labelNames: ["outcome"],
  registers: [registry]
});

export const sseClients = new client.Gauge({
  name: "sse_clients",
  help: "Open leaderboard SSE streams",
  registers: [registry]
});
