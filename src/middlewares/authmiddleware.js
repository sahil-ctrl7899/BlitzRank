const jwt = require("jsonwebtoken");
const { User } = require("../models");
const SECRET = process.env.JWT_SECRET || "MYSECRET123";

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ msg: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    // Fetch the latest user data from the database
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ msg: "User no longer exists" });
    }

    // Set the full user object on the request
    req.user = user;
    req.userId = user.id;
    
    // console.log("Authenticated User:", { id: user.id, role: user.role });
    
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
};

