import { forbidden, unauthorized } from "../errors/AppError.js";

export default (roles = []) => (req, _res, next) => {
  if (!req.user?.role) throw unauthorized();
  if (!roles.includes(req.user.role)) throw forbidden();
  next();
};
