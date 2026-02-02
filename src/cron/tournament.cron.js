const cron = require("node-cron");
const { Tournament } = require("../models");
const { Op } = require("sequelize");

// Run every minute
cron.schedule("* * * * *", async () => {
    try {
        const now = new Date();

        // 1️⃣ OPEN → ACTIVE
        await Tournament.update(
            { status: "ACTIVE" },
            {
                where: {
                    status: "OPEN",
                    startTime: { [Op.lte]: now }
                }
            }
        );

        // 2️⃣ ACTIVE → COMPLETED
        await Tournament.update(
            { status: "COMPLETED" },
            {
                where: {
                    status: "ACTIVE",
                    endTime: { [Op.lte]: now }
                }
            }
        );

        console.log("⏱ Tournament cron executed");
    } catch (err) {
        console.error("❌ Tournament cron error:", err.message);
    }
});
