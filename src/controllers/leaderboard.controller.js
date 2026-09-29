import leaderboard from "../services/leaderboard.service.js";
import { subscribe, channels } from "../lib/events.js";
import { sseClients } from "../lib/metrics.js";

export const full = async (req, res) =>
  res.json(await leaderboard.page(req.valid.params.tournamentId, req.valid.query));

export const topPlayers = async (req, res) => {
  const players = await leaderboard.top(req.valid.params.tournamentId, req.valid.params.n);
  res.json({ count: players.length, players });
};

export const userRank = async (req, res) =>
  res.json(await leaderboard.userRank(req.valid.params.tournamentId, req.valid.params.userId));

export const around = async (req, res) =>
  res.json(await leaderboard.around(req.valid.params.tournamentId, req.user.id, req.valid.query.radius));

/**
 * Server-Sent Events: one long-lived HTTP response per viewer, fed by the Redis pub/sub bus so it
 * works no matter which API instance handled the score submission. Updates are throttled to
 * at most one snapshot per second per stream, so a burst of scores doesn't flood clients.
 */
export const stream = async (req, res) => {
  const { tournamentId } = req.valid.params;
  res.writeHead(200, {
    "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive", "X-Accel-Buffering": "no"
  });
  sseClients.inc();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send("snapshot", await leaderboard.snapshot(tournamentId));

  let pending = false;
  const unsubscribe = subscribe(channels.leaderboard(tournamentId), (evt) => {
    if (evt.type === "tournament_completed") send("completed", evt);
    if (pending) return;
    pending = true;
    setTimeout(async () => {
      pending = false;
      try { send("update", await leaderboard.snapshot(tournamentId)); } catch { /* client gone */ }
    }, 1000);
  });
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    sseClients.dec();
  });
};
