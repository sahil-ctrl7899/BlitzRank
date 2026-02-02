module.exports = (roles = []) => {
    return (req, res, next) => {
        // console.log(req.user);
        if (!req.user || !req.user.role) {
            return res.status(401).json({ msg: "Unauthorized" });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ msg: "Access denied" });
        }

        next();
    };
};
