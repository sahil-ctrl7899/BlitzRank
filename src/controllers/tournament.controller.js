// controllers/tournament.controller.js
import tournamentService from "../services/tournament.service.js";

class TournamentController {

    async createTournament(req, res) {
        try {
            const tournament = await tournamentService.create(req.body);
            res.status(201).json(tournament);
        } catch (err) {
            res.status(400).json({ msg: "Failed to create tournament", error: err.message });
        }
    }

    async getTournaments(req, res) {
        try {
            const tournaments = await tournamentService.getAll();
            res.json(tournaments);
        } catch (err) {
            res.status(500).json({ msg: "Failed to fetch tournaments", error: err.message });
        }
    }

    async getTournamentById(req, res) {
        try {
            const tournament = await tournamentService.getById(req.params.id);
            if (!tournament) return res.status(404).json({ msg: "Not found" });
            res.json(tournament);
        } catch (err) {
            res.status(500).json({ msg: "Failed to fetch tournament", error: err.message });
        }
    }

    async updateStatus(req, res) {
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
    }

    async getParticipants(req, res) {
        try {
            const data = await tournamentService.getParticipants(req.params.id);

            if (!data || data.length === 0) {
                return res.json({
                    msg: "No participants found for this tournament",
                    participants: []
                });
            }
            res.json({
                count: data.length,
                participants: data
            });
        } catch (err) {
            res.status(500).json({
                msg: "Failed to fetch participants",
                error: err.message
            });
        }
    }


    async joinTournament(req, res) {
        try {
            const tournamentId = req.params.id;

            // 🔐 take userId ONLY from JWT
            const userId = req.user.id;

            const result = await tournamentService.joinTournament(
                userId,
                tournamentId
            );

            res.json(result);
        } catch (err) {
            res.status(400).json({ msg: err.message });
        }
    }

    async removeParticipant(req, res) {
        try {

            const { id: tournamentId, userId } = req.params;

            const result = await tournamentService.removeParticipant(
                userId,
                tournamentId
            );

            res.json(result);
        } catch (err) {
            res.status(400).json({ msg: err.message });
        }
    }
}

export default new TournamentController();


