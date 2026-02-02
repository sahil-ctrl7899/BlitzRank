// controllers/score.controller.js
import scoreService from "../services/score.service.js";

class ScoreController {

    async submitScore(req, res) {
        try {
            const result = await scoreService.submit(req.body);
            res.json(result);
        } catch (err) {
            res.status(400).json({ msg: err.message });
        }
    }

    async getScoreHistory(req, res) {
        try {
            const history = await scoreService.getHistory(req.params.participantId);

            if (!history || history.length === 0) {
                return res.json({
                    msg: "No score history found",
                    history: []
                });
            }

            res.json({
                count: history.length,
                history
            });
        } catch (err) {
            res.status(500).json({
                msg: "Failed to fetch score history",
                error: err.message
            });
        }
    }
}

export default new ScoreController();