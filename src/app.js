import express from "express";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import errorHandler from "./middlewares/errormiddleware.js";
import userRoutes from "./routes/user.routes.js";
import tournamentRoutes from "./routes/tournament.routes.js";
import scoreRoutes from "./routes/score.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";

const app = express();

app.use(express.json());

// create stream for access.log
const accessLogStream = fs.createWriteStream(
  path.join(process.cwd(), "logs/access.log"),
  { flags: "a" }
);

// log all requests to access.log
app.use(morgan("combined", { stream: accessLogStream }));

// Routes
app.use("/users", userRoutes);
app.use("/tournaments", tournamentRoutes);
app.use("/score", scoreRoutes);
app.use("/leaderboard", leaderboardRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

// for checking error and combined log
app.get("/test-error", (req, res) => {
  throw new Error("Test error logging");
});

// for checking logs
app.use(errorHandler);

export default app;
