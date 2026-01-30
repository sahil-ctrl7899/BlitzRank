const { Participant, ScoreHistory } = require("../models");
const {sequelize} = require("../config/db");

exports.submitScore = async (participantId, scoreDelta) => {
  return sequelize.transaction(async (t) => {
    const participant = await Participant.findByPk(participantId, { transaction: t });
    if (!participant) throw new Error("Participant not found");

    //Update score
    participant.currentScore = Number(participant.currentScore) + Number(scoreDelta);
    await participant.save({ transaction: t });

    //Log score history
   await ScoreHistory.create(
  {
    participantId,
    scoreAdded: scoreDelta,
    finalScore: participant.currentScore
  },
  { transaction: t }
);

    return {
      message: "Score submitted",
      newScore: participant.currentScore
    };

  });
};
