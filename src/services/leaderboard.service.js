// services/leaderboard.service.js
const { Participant, User } = require("../models");

class LeaderboardService {

  async full(tournamentId) {
    return Participant.findAll({
      where: { tournamentId },
      include: {
        model: User,
        attributes: ["id", "username"]
      },
      order: [["currentScore", "DESC"]]
    });
  }

  async top(tournamentId, limit) {
    return Participant.findAll({
      where: { tournamentId },
      include: {
        model: User,
        attributes: ["id", "username"]
      },
      order: [["currentScore", "DESC"]],
      limit: Number(limit)
    });
  }

  async userRank(tournamentId, userId) {
    const participants = await Participant.findAll({
      where: { tournamentId },
      order: [["currentScore", "DESC"]]
    });

    const index = participants.findIndex(
      (p) => p.userId === Number(userId)
    );

    if (index === -1) throw new Error("User not found");

    return {
      rank: index + 1,
      score: participants[index].currentScore
    };
  }
}

module.exports = new LeaderboardService();

