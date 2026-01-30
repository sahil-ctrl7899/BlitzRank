const scoreService = require("../services/score.service");

exports.submitScore = async (req, res) => {
  try {
    const { participantId, scoreDelta } = req.body;

    if (!participantId || scoreDelta === undefined) {
      return res.status(400).json({ msg: "participantId and scoreDelta are required"});
    }
      const result = await scoreService.submitScore(
      participantId,
      scoreDelta
    );

    res.json(result);

  } catch (err) {
    res.status(400).json({msg: err.message });
  }
};
