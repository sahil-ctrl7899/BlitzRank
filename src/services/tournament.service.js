import { sequelize } from "../config/db.js";
import { Tournament, Participant, User, WalletTransaction } from "../models/index.js";
import redis from "../config/redis.js";

class TournamentService {

  async create(data) {
    return Tournament.create({
      name: data.name,
      entryFee: data.entryFee,
      startTime: data.startTime,
      endTime: data.endTime
    });
  }

  async getAll() {
    const cacheKey = "tournaments:all";
    const cacheData = await redis.get(cacheKey);

    if(cacheData){
      // console.log("Tm form cache");
      return JSON.parse(cacheData);
    }

    const tournaments = await Tournament.findAll({ order: [["createdAt", "DESC"]] });

    await redis.setEx(cacheKey, 60, JSON.stringify(tournaments));

    // console.log("Tm form db");
    return tournaments;
  }

  async getById(id) {
    const cacheKey  = `tournaments:${id}`;
    const cacheData = await redis.get(cacheKey);

    if(cacheData){
      return JSON.parse(cacheData);
    }

    const tournament = await Tournament.findByPk(id);

    await redis.setEx(cacheKey, 60, JSON.stringify(tournament));

    return tournament;
  }

  async updateStatus(id, status) {
    const tournament = await Tournament.findByPk(id);
    if (!tournament) throw new Error("Tournament not found");

    tournament.status = status;
    await tournament.save();

    return tournament;
  }

  async getParticipants(tournamentId) {
  const cacheKey = `tournament:${tournamentId}:participants`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const participants = await Participant.findAll({ where: { tournamentId },
    include: {
      model: User,
      attributes: ["id", "username"]
    },
    order: [["currentScore", "DESC"]],
    raw: true
  });

  await redis.setEx(cacheKey, 60, JSON.stringify(participants));

  return participants;
}


  async joinTournament(userId, tournamentId) {
    return sequelize.transaction(async (t) => {
      // Fetch user
      const user = await User.findByPk(userId, { transaction: t });
      if (!user) throw new Error("User not found");

      // DOUBLE SAFETY CHECK
      if (user.role !== "USER") {
        throw new Error("Only USER accounts can join tournaments");
      }

      // Fetch tournament
      const tournament = await Tournament.findByPk(tournamentId, {
        transaction: t
      });
      if (!tournament) throw new Error("Tournament not found");

      // Check tournament status
      if (tournament.status !== "OPEN") {
        throw new Error("Tournament not open for joining");
      }

      // Check duplicate join
      const alreadyJoined = await Participant.findOne({
        where: { userId, tournamentId },
        transaction: t
      });

      if (alreadyJoined) {
        throw new Error("User already joined this tournament");
      }

      // Check balance
      if (Number(user.balance) < Number(tournament.entryFee)) {
        throw new Error("Insufficient balance");
      }

      // Deduct balance
      user.balance = Number(user.balance) - Number(tournament.entryFee);
      await user.save({ transaction: t });

      // Create wallet transaction
      await WalletTransaction.create(
        {
          userId,
          type: "DEBIT",
          amount: tournament.entryFee,
          reason: "JOIN_TOURNAMENT",
          referenceId: tournamentId
        },
        { transaction: t }
      );

      //  Add participant
      const participant = await Participant.create(
        {
          userId,
          tournamentId,
          currentScore: 0
        },
        { transaction: t }
      );

      // Success
      return {
        message: "Joined tournament successfully",
        participantId: participant.id,
        remainingBalance: user.balance
      };
    });
  }

  async removeParticipant(userId, tournamentId) {
    return sequelize.transaction(async (t) => {
      const tournament = await Tournament.findByPk(tournamentId, {
        transaction: t
      });

      if (!tournament) throw new Error("Tournament not found");

      if (tournament.status !== "OPEN") {
        throw new Error("Cannot remove participant after tournament start");
      }

      const participant = await Participant.findOne({
        where: { userId, tournamentId },
        transaction: t
      });

      if (!participant) {
        throw new Error("Participant not found");
      }

      const user = await User.findByPk(userId, { transaction: t });

      //  Refund entry fee
      user.balance = Number(user.balance) + Number(tournament.entryFee);
      await user.save({ transaction: t });

      // Wallet log
      await WalletTransaction.create(
        {
          userId,
          type: "CREDIT",
          amount: tournament.entryFee,
          reason: "REMOVE_PARTICIPANT_REFUND",
          referenceId: tournamentId
        },
        { transaction: t }
      );

      // Remove participant
      await participant.destroy({ transaction: t });

      return {
        message: "Participant removed and refunded",
        refundedAmount: tournament.entryFee,
        balance: user.balance
      };
    });
  }
}

export default new TournamentService();
