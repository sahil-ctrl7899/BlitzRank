import scoreService from "../services/score.service.js";
import { score as schemas } from "../validators/schemas.js";
import { badRequest } from "../errors/AppError.js";

export const submitScore = async (req, res) => {
  const header = req.get("Idempotency-Key");
  const parsed = schemas.idempotencyKey.safeParse(header);
  if (!parsed.success) throw badRequest("Idempotency-Key must be 8-128 chars of [A-Za-z0-9_:.-]");

  const result = await scoreService.submit({ ...req.valid.body, idempotencyKey: parsed.data });
  if (result.replayed) res.setHeader("Idempotent-Replayed", "true");
  res.status(result.replayed ? 200 : 201).json(result);
};

export const history = async (req, res) => {
  const { rows, count } = await scoreService.getHistory(req.valid.params.participantId, req.valid.query);
  res.json({ total: count, ...req.valid.query, history: rows });
};
