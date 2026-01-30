// services/tournament.service.js
const { Tournament, Participant, User, WalletTransaction } = require("../models");
const { sequelize } = require("../config/db");

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
    return Tournament.findAll({ order: [["createdAt", "DESC"]] });
  }

  async getById(id) {
    return Tournament.findByPk(id);
  }

  async updateStatus(id, status) {
    const tournament = await Tournament.findByPk(id);
    if (!tournament) throw new Error("Tournament not found");

    tournament.status = status;
    await tournament.save();

    return tournament;
  }

  async getParticipants(tournamentId) {
    return Participant.findAll({
      where: { tournamentId },
      include: {
        model: User,
        attributes: ["id", "username"]
      },
      order: [["currentScore", "DESC"]]
    });
  }

  async joinTournament(userId, tournamentId) {
    return sequelize.transaction(async (t) => {
      const user = await User.findByPk(userId, { transaction: t });
      if (!user) throw new Error("User not found");

      const tournament = await Tournament.findByPk(tournamentId, {
        transaction: t
      });
      if (!tournament) throw new Error("Tournament not found");

      if (tournament.status !== "OPEN") {
        throw new Error("Tournament not open for joining");
      }

      const alreadyJoined = await Participant.findOne({
        where: { userId, tournamentId },
        transaction: t
      });

      if (alreadyJoined) {
        throw new Error("User already joined this tournament");
      }

      if (Number(user.balance) < Number(tournament.entryFee)) {
        throw new Error("Insufficient balance");
      }

      user.balance = Number(user.balance) - Number(tournament.entryFee);
      await user.save({ transaction: t });

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

      const participant = await Participant.create(
        {
          userId,
          tournamentId,
          currentScore: 0
        },
        { transaction: t }
      );

      return {
        message: "Joined tournament successfully",
        participantId: participant.id,
        remainingBalance: user.balance
      };
    });
  }
}

module.exports = new TournamentService();

