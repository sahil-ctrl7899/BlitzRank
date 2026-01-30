const { sequelize } = require("../config/db");
const {
    Tournament,
    Participant,
    ScoreHistory
} = require("../models");

exports.submit = async ({ userId, tournamentId, betAmount, winAmount }) => {
    if (betAmount <= 0) throw new Error("Invalid bet amount");

    return sequelize.transaction(async (t) => {
        const tournament = await Tournament.findByPk(tournamentId, {
            transaction: t
        });

        if (!tournament) throw new Error("Tournament not found");
        if (tournament.status !== "ACTIVE") {
            throw new Error("Tournament is not active");
        }

        const participant = await Participant.findOne({
            where: { userId, tournamentId },
            transaction: t
        });

        if (!participant) {
            throw new Error("User not a participant");
        }

        const score = Number(winAmount) / Number(betAmount);

        participant.currentScore =
            Number(participant.currentScore) + score;

        await participant.save({ transaction: t });

        await ScoreHistory.create(
            {
                participantId: participant.id,
                scoreAdded: score
            },
            { transaction: t }
        );

        return {
            participantId: participant.id,
            scoreAdded: score,
            totalScore: participant.currentScore
        };
    });
};

exports.getHistory = async (participantId) => {
    return ScoreHistory.findAll({
        where: { participantId },
        order: [["createdAt", "DESC"]]
    });
};
