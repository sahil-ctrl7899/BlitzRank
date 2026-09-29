import { httpDuration } from "../lib/metrics.js";

export default (req, res, next) => {
  const end = httpDuration.startTimer();
  res.on("finish", () => {
    // Use the route template (/tournaments/:id), never the raw URL, to keep label cardinality bounded.
    const route = req.route ? `${req.baseUrl}${req.route.path}` : "unmatched";
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
};
