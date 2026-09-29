import authService from "../services/auth.service.js";

export const signup = async (req, res) => res.status(201).json(await authService.register(req.valid.body));
export const login = async (req, res) => res.json(await authService.login(req.valid.body));
export const refresh = async (req, res) => res.json(await authService.refresh(req.valid.body.refreshToken));
export const logout = async (req, res) => {
  await authService.logout(req.valid.body.refreshToken);
  res.status(204).end();
};
export const me = (req, res) => res.json({ user: req.user });
