const leaderboardService = require("../services/leaderboard.service");

exports.fullLeaderboard = async (req, res) => {
    const data = await leaderboardService.full(req.params.tournamentId);
    res.json(data);
};

exports.topPlayers = async (req, res) => {
    const data = await leaderboardService.top(
        req.params.tournamentId,
        req.params.n
    );
    res.json(data);
};

exports.userRank = async (req, res) => {
    const data = await leaderboardService.userRank(
        req.params.tournamentId,
        req.params.userId
    );
    res.json(data);
};
