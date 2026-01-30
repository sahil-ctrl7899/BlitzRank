const { sequelize } = require("../config/db");
const { Tournament, Participant, User, WalletTransaction } = require("../models");

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
      // 1️⃣ Fetch user
      const user = await User.findByPk(userId, { transaction: t });
      if (!user) throw new Error("User not found");

      // 🔒 DOUBLE SAFETY CHECK
      if (user.role !== "USER") {
        throw new Error("Only USER accounts can join tournaments");
      }

      // 2️⃣ Fetch tournament
      const tournament = await Tournament.findByPk(tournamentId, {
        transaction: t
      });
      if (!tournament) throw new Error("Tournament not found");

      // 3️⃣ Check tournament status
      if (tournament.status !== "OPEN") {
        throw new Error("Tournament not open for joining");
      }

      // 4️⃣ Check duplicate join
      const alreadyJoined = await Participant.findOne({
        where: { userId, tournamentId },
        transaction: t
      });

      if (alreadyJoined) {
        throw new Error("User already joined this tournament");
      }

      // 5️⃣ Check balance
      if (Number(user.balance) < Number(tournament.entryFee)) {
        throw new Error("Insufficient balance");
      }

      // 6️⃣ Deduct balance
      user.balance = Number(user.balance) - Number(tournament.entryFee);
      await user.save({ transaction: t });

      // 7️⃣ Create wallet transaction
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

      // 8️⃣ Add participant
      const participant = await Participant.create(
        {
          userId,
          tournamentId,
          currentScore: 0
        },
        { transaction: t }
      );

      // 9️⃣ Success
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

      // 1️⃣ Refund entry fee
      user.balance = Number(user.balance) + Number(tournament.entryFee);
      await user.save({ transaction: t });

      // 2️⃣ Wallet log
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

      // 3️⃣ Remove participant
      await participant.destroy({ transaction: t });

      return {
        message: "Participant removed and refunded",
        refundedAmount: tournament.entryFee,
        balance: user.balance
      };
    });
  }
}

module.exports = new TournamentService();