const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/users", require("./routes/user.routes"));
app.use("/tournaments", require("./routes/tournament.routes"));
app.use("/score", require("./routes/score.routes"));
app.use("/leaderboard", require("./routes/leaderboard.routes"));



app.get("/", (req, res) => {
    res.send("API is running");
});

module.exports = app;