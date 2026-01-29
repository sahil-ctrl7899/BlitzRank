const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.json({ error: "No token provided"});

    const token = authHeader.split(" ")[1];
    try {
     const decoded = jwt.verify(token,SECRET);
     req.userId = decoded.userId;
     next();
    } catch (err) {
     return res.json({ error: "Invalid token" });
    }
};
