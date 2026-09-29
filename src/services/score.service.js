import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { Tournament, Participant, ScoreHistory } from "../models/index.js";
import { conflict, notFound } from "../errors/AppError.js";
import leaderboard from "./leaderboard.service.js";
import { publish, channels } from "../lib/events.js";
import { scheduleLeaderboardReconcile } from "../queues/index.js";
import { invalidate, keys } from "../lib/cache.js";
import { scoreSubmissions } from "../lib/metrics.js";
import logger from "../utils/logger.js";

import { computeScore } from "./score.logic.js";

async function submit({ userId, tournamentId, betAmount, winAmount, idempotencyKey }) {
  const score = computeScore(betAmount, winAmount);

  const outcome = await sequelize.transaction(async (t) => {
    const tournament = await Tournament.findByPk(tournamentId, { transaction: t, lock: t.LOCK.SHARE });
    if (!tournament) throw notFound("Tournament not found");
    if (tournament.status !== "ACTIVE") throw conflict("Tournament is not active", "NOT_ACTIVE");

    const participant = await Participant.findOne({ where: { userId, tournamentId }, transaction: t });
    if (!participant) throw notFound("User is not a participant in this tournament");

    // Claim the idempotency key first. ON CONFLICT DO NOTHING (rather than catching the error)
    // keeps the transaction alive, and the unique index makes the claim race-free.
    const [inserted] = await sequelize.query(
      `INSERT INTO "ScoreHistories" ("participantId", "scoreAdded", "idempotencyKey", "createdAt", "updatedAt")
       VALUES (:participantId, :score, :key, NOW(), NOW())
       ON CONFLICT ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL DO NOTHING
       RETURNING id`,
      { replacements: { participantId: participant.id, score, key: idempotencyKey ?? null },
        type: QueryTypes.SELECT, transaction: t }
    );

    if (!inserted) {
      const prior = await ScoreHistory.findOne({ where: { idempotencyKey }, transaction: t });
      if (prior.participantId !== participant.id) {
        throw conflict("Idempotency key already used for a different submission", "IDEMPOTENCY_KEY_REUSED");
      }
      const current = await Participant.findByPk(participant.id, { transaction: t });
      return { replayed: true, participantId: participant.id, scoreAdded: prior.scoreAdded, totalScore: current.currentScore };
    }

    // Atomic increment: concurrent submissions for the same player can't lose updates.
    const [row] = await sequelize.query(
      `UPDATE "Participants" SET "currentScore" = "currentScore" + :score, "updatedAt" = NOW()
       WHERE id = :id RETURNING "currentScore"`,
      { replacements: { score, id: participant.id }, type: QueryTypes.SELECT, transaction: t }
    );
    return { replayed: false, participantId: participant.id, scoreAdded: score, totalScore: row.currentScore };
  });

  scoreSubmissions.inc({ outcome: outcome.replayed ? "replayed" : "applied" });

  if (!outcome.replayed) {
    // Post-commit side effects. If the process dies right here the DB is still correct and the
    // reconcile job below (or the next one) repairs Redis, so the board is eventually consistent.
    try {
      const newScore = await leaderboard.incrementScore(tournamentId, userId, score);
      await publish(channels.leaderboard(tournamentId), { type: "score", tournamentId, userId, delta: score, score: newScore });
    } catch (err) {
      logger.warn("realtime leaderboard update failed; reconcile will repair", { tournamentId, error: err.message });
    }
    await Promise.allSettled([
      scheduleLeaderboardReconcile(tournamentId),
      invalidate(keys.participants(tournamentId))
    ]);
  }
  return outcome;
}

const getHistory = (participantId, { limit, offset }) =>
  ScoreHistory.findAndCountAll({
    where: { participantId }, order: [["createdAt", "DESC"], ["id", "DESC"]], limit, offset
  });

export default { submit, getHistory };
