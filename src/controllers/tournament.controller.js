import tournamentService from "../services/tournament.service.js";
import { payoutsFor } from "../services/payout.service.js";

export const create = async (req, res) => res.status(201).json(await tournamentService.create(req.valid.body));
export const list = async (req, res) => res.json(await tournamentService.list(req.valid.query));
export const getById = async (req, res) => res.json(await tournamentService.getById(req.valid.params.id));

export const updateStatus = async (req, res) =>
  res.json(await tournamentService.transition(req.valid.params.id, req.valid.body.status));

export const participants = async (req, res) => {
  const data = await tournamentService.getParticipants(req.valid.params.id);
  res.json({ count: data.length, participants: data });
};

export const payouts = async (req, res) => res.json(await payoutsFor(req.valid.params.id));

// userId comes ONLY from the verified token, never from the request body.
export const join = async (req, res) =>
  res.json(await tournamentService.joinTournament(req.user.id, req.valid.params.id));

export const removeParticipant = async (req, res) => {
  const { id, userId } = req.valid.params;
  res.json(await tournamentService.removeParticipant(userId, id));
};
