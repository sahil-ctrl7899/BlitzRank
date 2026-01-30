// controllers/leaderboard.controller.js
const leaderboardService = require("../services/leaderboard.service");

class LeaderboardController {

  async fullLeaderboard(req, res) {
    try {
      const data = await leaderboardService.full(req.params.tournamentId);
      res.json({
        count: data.length,
        leaderboard: data
      });
    } catch (err) {
      res.status(500).json({
        msg: "Failed to fetch leaderboard",
        error: err.message
      });
    }
  }

  async topPlayers(req, res) {
    try {
      const data = await leaderboardService.top(
        req.params.tournamentId,
        req.params.n
      );

      if (!data || data.length === 0) {
        return res.json({
          msg: "No players found",
          players: []
        });
      }

      res.json({
        count: data.length,
        players: data
      });
    } catch (err) {
      res.status(500).json({
        msg: "Failed to fetch top players",
        error: err.message
      });
    }
  }

  async userRank(req, res) {
    try {
      const data = await leaderboardService.userRank(
        req.params.tournamentId,
        req.params.userId
      );

      res.json(data);
    } catch (err) {
      res.status(404).json({
        msg: err.message
      });
    }
  }
}

module.exports = new LeaderboardController();

