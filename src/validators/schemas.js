import { z } from "zod";

const id = z.coerce.number().int().positive();
const money = z.union([z.number(), z.string()]).transform(String)
  .refine((v) => /^\d{1,10}(\.\d{1,2})?$/.test(v) && Number(v) > 0, "must be a positive amount with at most 2 decimals");
const pagination = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
};

export const idParam = z.object({ id });

export const auth = {
  credentials: z.object({
    username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/, "letters, digits, _ . - only"),
    password: z.string().min(8).max(72) // bcrypt ignores everything past 72 bytes
  }),
  login: z.object({ username: z.string().min(1).max(64), password: z.string().min(1).max(72) }),
  refresh: z.object({ refreshToken: z.string().min(20).max(200) })
};

export const users = {
  role: z.object({ role: z.enum(["USER", "ADMIN", "GAME_SERVER"]) }),
  wallet: z.object({ amount: money, reason: z.string().trim().min(1).max(64).optional() }),
  page: z.object(pagination)
};

export const tournaments = {
  create: z.object({
    name: z.string().trim().min(3).max(100),
    entryFee: z.union([z.number(), z.string()]).transform(String)
      .refine((v) => /^\d{1,8}(\.\d{1,2})?$/.test(v), "invalid amount"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date()
  }).refine((v) => v.endTime > v.startTime, { message: "endTime must be after startTime", path: ["endTime"] }),
  status: z.object({ status: z.enum(["ACTIVE", "COMPLETED"]) }),
  list: z.object({ status: z.enum(["OPEN", "ACTIVE", "COMPLETED"]).optional() }),
  removeParams: z.object({ id, userId: id })
};

export const score = {
  submit: z.object({
    userId: id,
    tournamentId: id,
    betAmount: z.number().positive().max(1e9),
    winAmount: z.number().min(0).max(1e12)
  }),
  idempotencyKey: z.string().min(8).max(128).regex(/^[\w:.-]+$/).optional(),
  historyParams: z.object({ participantId: id }),
  page: z.object(pagination)
};

export const leaderboard = {
  tournament: z.object({ tournamentId: id }),
  page: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0)
  }),
  top: z.object({ tournamentId: id, n: z.coerce.number().int().min(1).max(100) }),
  user: z.object({ tournamentId: id, userId: id }),
  around: z.object({ radius: z.coerce.number().int().min(1).max(25).default(3) })
};
