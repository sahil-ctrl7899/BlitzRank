const { Tournament, Participant, User } = require("../models");

exports.create = async (data) => {
    return Tournament.create({
        name: data.name,
        entryFee: data.entryFee,
        startTime: data.startTime,
        endTime: data.endTime
    });
};

exports.getAll = async () => {
    return Tournament.findAll({ order: [["createdAt", "DESC"]] });
};

exports.getById = async (id) => {
    return Tournament.findByPk(id);
};

exports.updateStatus = async (id, status) => {
    const tournament = await Tournament.findByPk(id);
    if (!tournament) throw new Error("Tournament not found");

    tournament.status = status;
    await tournament.save();

    return tournament;
};

exports.getParticipants = async (tournamentId) => {
    return Participant.findAll({
        where: { tournamentId },
        include: {
            model: User,
            attributes: ["id", "username"]
        },
        order: [["currentScore", "DESC"]]
    });
};
