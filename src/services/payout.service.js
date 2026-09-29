import { sequelize } from "../config/db.js";
import { Participant, Tournament, WalletTransaction } from "../models/index.js";
import { env } from "../config/env.js";
import { creditTx } from "./wallet.service.js";
import { computePayouts, netPool } from "./payout.logic.js";
import { fromCents } from "../lib/money.js";
import { invalidate, keys } from "../lib/cache.js";
import { publish, channels } from "../lib/events.js";
import logger from "../utils/logger.js";

/**
 * Pays out a completed tournament. Safe to run any number of times:
 *  1. the tournament row is locked FOR UPDATE, and `payoutStatus = DONE` short-circuits re-runs
 *  2. the partial unique index wallet_prize_once_uq makes a double credit impossible
 *  3. everything (credits, ledger, ranks, status flip) commits or rolls back as one unit
 * So a crashed / retried / duplicated BullMQ job can never pay twice.
 */
export async function distributePrizes(tournamentId) {
  const result = await sequelize.transaction(async (t) => {
    const tournament = await Tournament.findByPk(tournamentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!tournament) return { skipped: "not_found" };
    if (tournament.status !== "COMPLETED") throw new Error("Tournament not completed yet"); // -> BullMQ retry
    if (tournament.payoutStatus === "DONE") return { skipped: "already_paid" };

    const participants = await Participant.findAll({
      where: { tournamentId },
      order: [["currentScore", "DESC"], ["id", "ASC"]], // deterministic tie-break: earliest joiner wins
      transaction: t
    });

    // Final standings are persisted so history survives even after the Redis board expires.
    for (const [i, p] of participants.entries()) {
      await p.update({ rank: i + 1 }, { transaction: t });
    }

    const scored = participants.filter((p) => Number(p.currentScore) > 0);
    const payouts = [];

    if (scored.length === 0) {
      // Nobody scored: refund entry fees instead of paying a prize.
      for (const p of participants) {
        await creditTx(t, p.userId, tournament.entryFee, "TOURNAMENT_REFUND", tournamentId);
        payouts.push({ userId: p.userId, amount: tournament.entryFee, kind: "refund" });
      }
    } else {
      const pool = netPool(tournament.prizePool, env.PLATFORM_RAKE_PERCENT);
      const shares = computePayouts(pool, scored.length);
      for (const [i, share] of shares.entries()) {
        const amount = fromCents(share);
        await creditTx(t, scored[i].userId, amount, "TOURNAMENT_PRIZE", tournamentId);
        payouts.push({ userId: scored[i].userId, amount, kind: "prize", rank: i + 1 });
      }
    }

    await tournament.update({ payoutStatus: "DONE" }, { transaction: t });
    return { paid: payouts };
  });

  if (result.paid) {
    await invalidate(
      keys.tournament(tournamentId), ...keys.tournamentLists, keys.participants(tournamentId),
      ...result.paid.map((p) => keys.user(p.userId))
    );
    await publish(channels.leaderboard(tournamentId), { type: "tournament_completed", tournamentId });
    logger.info("tournament payout complete", { tournamentId, winners: result.paid.length });
  }
  return result;
}

export const payoutsFor = (tournamentId) =>
  WalletTransaction.findAll({
    where: { referenceId: tournamentId, reason: ["TOURNAMENT_PRIZE", "TOURNAMENT_REFUND"] },
    order: [["amount", "DESC"]]
  });
