const express = require("express");

const app = express();


console.log("APP LOADED");

app.use(express.json());

// Routes
app.use("/users", require("./routes/user.routes"));
app.use("/tournaments", require("./routes/tournament.routes"));



app.get("/", (req, res) => {
    res.send("API is running");
});

module.exports = app;