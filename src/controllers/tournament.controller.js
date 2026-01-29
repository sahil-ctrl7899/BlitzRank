const tournamentService = require("../services/tournament.service");

exports.createTournament = async (req, res) => {
    try {
        const tournament = await tournamentService.create(req.body);
        res.status(201).json(tournament);
    } catch (err) {
        res.status(400).json({ msg: "Failed to create tournament", error: err.message });
    }
};

exports.getTournaments = async (req, res) => {
    try {
        const tournaments = await tournamentService.getAll();
        res.json(tournaments);
    } catch (err) {
        res.status(500).json({ msg: "Failed to fetch tournaments", error: err.message });
    }
};

exports.getTournamentById = async (req, res) => {
    try {
        const tournament = await tournamentService.getById(req.params.id);
        if (!tournament) return res.status(404).json({ msg: "Not found" });
        res.json(tournament);
    } catch (err) {
        res.status(500).json({ msg: "Failed to fetch tournament", error: err.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ msg: "Status is required" });
        }

        const tournament = await tournamentService.updateStatus(
            req.params.id,
            status
        );
        res.json(tournament);
    } catch (err) {
        res.status(400).json({ msg: "Failed to update status", error: err.message });
    }
};

exports.getParticipants = async (req, res) => {
    try {
        const data = await tournamentService.getParticipants(req.params.id);
        res.json(data);
    } catch (err) {
        res.status(500).json({ msg: "Failed to fetch participants", error: err.message });
    }
};

exports.joinTournament = async (req, res) => {
    const tournamentId = req.params.id;
    const { userId } = req.body;

    try {
        const result = await tournamentService.joinTournament(
            userId,
            tournamentId
        );
        res.json(result);
    } catch (err) {
        res.status(400).json({ msg: err.message });
    }
};
