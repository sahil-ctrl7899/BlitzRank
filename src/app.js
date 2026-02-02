const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const errorHandler = require("./middlewares/errormiddleware");

const app = express();


console.log("APP LOADED");

app.use(express.json());

// create stream for access.log
const accessLogStream = fs.createWriteStream(
  path.join(process.cwd(), "logs/access.log"),{flags:"a"}
);

// log all requests to access.log
app.use(morgan("combined", {stream: accessLogStream}));

// Routes
app.use("/users", require("./routes/user.routes"));
app.use("/tournaments", require("./routes/tournament.routes"));
app.use("/score", require("./routes/score.routes"));
app.use("/leaderboard", require("./routes/leaderboard.routes"));

app.get("/", (req, res) => {
    res.send("API is running");
});

// for checking error and combined log
app.get("/test-error", (req, res) => {
  throw new Error("Test error logging");
});

// for chacking logs
app.use(errorHandler);

module.exports = app;