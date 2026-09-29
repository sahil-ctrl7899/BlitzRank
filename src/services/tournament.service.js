import { QueryTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import { Tournament, Participant, User } from "../models/index.js";
import { AppError, conflict, forbidden, notFound } from "../errors/AppError.js";
import { creditTx, debitTx, invalidateWalletCaches } from "./wallet.service.js";
import leaderboard from "./leaderboard.service.js";
import { cached, invalidate, keys } from "../lib/cache.js";
import { publish, channels } from "../lib/events.js";
import { enqueuePayout } from "../queues/index.js";
import logger from "../utils/logger.js";

import { canTransition } from "./tournament.state.js";

const bust = (id) => invalidate(...keys.tournamentLists, keys.tournament(id), keys.participants(id));

async function create(data) {
  const tournament = await Tournament.create(data);
  await invalidate(...keys.tournamentLists);
  return tournament;
}

const list = ({ status } = {}) =>
  cached(keys.tournamentList(status), 60, () =>
    Tournament.findAll({ where: status ? { status } : {}, order: [["createdAt", "DESC"]], raw: true })
  );

async function getById(id) {
  const t = await cached(keys.tournament(id), 60, () => Tournament.findByPk(id, { raw: true }));
  if (!t) throw notFound("Tournament not found");
  return t;
}

const getParticipants = (id) =>
  cached(keys.participants(id), 30, () =>
    Participant.findAll({
      where: { tournamentId: id },
      include: { model: User, attributes: ["id", "username"] },
      order: [["currentScore", "DESC"], ["id", "ASC"]]
    }).then((rows) => rows.map((p) => p.toJSON()))
  );

/**
 * Moves a tournament forward. The UPDATE is conditional on the current status, so if two
 * admins (or an admin and the scheduler) race, exactly one wins and the loser gets a 409.
 */
async function transition(id, to) {
  const t = await Tournament.findByPk(id);
  if (!t) throw notFound("Tournament not found");
  if (!canTransition(t.status, to)) {
    throw conflict(`Cannot move tournament from ${t.status} to ${to}`, "INVALID_TRANSITION");
  }
  const [count] = await Tournament.update({ status: to }, { where: { id, status: t.status } });
  if (!count) throw conflict("Tournament status changed concurrently", "INVALID_TRANSITION");
  await onTransitioned(id, to);
  return Tournament.findByPk(id);
}

async function onTransitioned(id, to) {
  await bust(id);
  await publish(channels.leaderboard(id), { type: "status", tournamentId: id, status: to });
  if (to === "COMPLETED") await enqueuePayout(id);
}

/**
 * Called by the repeatable lifecycle job. Set-based conditional UPDATEs ... RETURNING are
 * idempotent, so any number of workers can run this concurrently without double transitions.
 * The final sweep re-enqueues payouts that were lost (crash between commit and enqueue).
 */
async function advanceLifecycle() {
  const move = (from, to, col) =>
    sequelize.query(
      `UPDATE "Tournaments" SET status = :to, "updatedAt" = NOW()
       WHERE status = :from AND "${col}" <= NOW() RETURNING id`,
      { replacements: { from, to }, type: QueryTypes.SELECT }
    );
  const started = await move("OPEN", "ACTIVE", "startTime");
  const finished = await move("ACTIVE", "COMPLETED", "endTime");
  for (const { id } of started) await onTransitioned(id, "ACTIVE");
  for (const { id } of finished) await onTransitioned(id, "COMPLETED");

  const unpaid = await Tournament.findAll({
    where: { status: "COMPLETED", payoutStatus: "PENDING" }, attributes: ["id"], raw: true
  });
  for (const { id } of unpaid) await enqueuePayout(id);

  if (started.length || finished.length) {
    logger.info("lifecycle tick", { started: started.length, finished: finished.length });
  }
  return { started: started.length, finished: finished.length, payoutsEnqueued: unpaid.length };
}

async function joinTournament(userId, tournamentId) {
  const result = await sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) throw notFound("User not found");
    if (user.role !== "USER") throw forbidden("Only USER accounts can join tournaments");

    // FOR UPDATE up front. Every join writes prizePool on this row anyway, and taking the
    // exclusive lock FIRST avoids the classic share->exclusive upgrade deadlock between joiners.
    const tournament = await Tournament.findByPk(tournamentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!tournament) throw notFound("Tournament not found");
    if (tournament.status !== "OPEN") throw conflict("Tournament not open for joining", "NOT_OPEN");

    // The unique (userId, tournamentId) constraint is the real duplicate-join guard. ON CONFLICT
    // DO NOTHING (rather than catching the violation) keeps the transaction usable, and under a
    // burst of identical requests exactly one insert wins while the rest get a clean 409.
    const [participant] = await sequelize.query(
      `INSERT INTO "Participants" ("userId", "tournamentId", "currentScore", "createdAt", "updatedAt")
       VALUES (:userId, :tournamentId, 0, NOW(), NOW())
       ON CONFLICT ("userId", "tournamentId") DO NOTHING RETURNING id`,
      { replacements: { userId, tournamentId }, type: QueryTypes.SELECT, transaction: t }
    );
    if (!participant) throw conflict("User already joined this tournament", "ALREADY_JOINED");

    const balance = await debitTx(t, userId, tournament.entryFee, "JOIN_TOURNAMENT", tournamentId);
    await Tournament.increment({ prizePool: tournament.entryFee }, { where: { id: tournamentId }, transaction: t });
    return { participantId: participant.id, remainingBalance: balance };
  });

  await Promise.all([
    leaderboard.addParticipant(tournamentId, userId),
    bust(tournamentId),
    invalidateWalletCaches(userId)
  ]);
  return { message: "Joined tournament successfully", ...result };
}

async function removeParticipant(userId, tournamentId) {
  const result = await sequelize.transaction(async (t) => {
    const tournament = await Tournament.findByPk(tournamentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!tournament) throw notFound("Tournament not found");
    if (tournament.status !== "OPEN") {
      throw new AppError(409, "NOT_OPEN", "Cannot remove participant after tournament start");
    }
    const removed = await Participant.destroy({ where: { userId, tournamentId }, transaction: t });
    if (!removed) throw notFound("Participant not found");

    const balance = await creditTx(t, userId, tournament.entryFee, "REMOVE_PARTICIPANT_REFUND", tournamentId);
    await Tournament.decrement({ prizePool: tournament.entryFee }, { where: { id: tournamentId }, transaction: t });
    return { refundedAmount: tournament.entryFee, balance };
  });

  await Promise.all([
    leaderboard.removeParticipant(tournamentId, userId),
    bust(tournamentId),
    invalidateWalletCaches(userId)
  ]);
  return { message: "Participant removed and refunded", ...result };
}

export default { create, list, getById, getParticipants, transition, advanceLifecycle, joinTournament, removeParticipant };
