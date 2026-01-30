const scoreService = require("../services/score.service");

exports.submitScore = async (req, res) => {
  try {
    const result = await scoreService.submit(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
};

exports.getScoreHistory = async (req, res) => {
  const history = await scoreService.getHistory(req.params.participantId);
  res.json(history);
};
