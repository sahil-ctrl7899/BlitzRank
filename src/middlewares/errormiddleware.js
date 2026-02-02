const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  logger.error(err.message, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  res.status(err.status || 500).json({
    msg: err.message || "Internal server error"
  });
};
