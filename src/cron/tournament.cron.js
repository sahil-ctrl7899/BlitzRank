import cron from "node-cron";
import { Tournament } from "../models/index.js";
import { Op } from "sequelize";

// Run every minute
cron.schedule("* * * * *", async () => {
    try {
        const now = new Date();

        // OPEN → ACTIVE conversion...
        await Tournament.update(
            { status: "ACTIVE" },
            {
                where: {
                    status: "OPEN",
                    startTime: { [Op.lte]: now }
                }
            }
        );
        // ACTIVE → COMPLETED conversion..
        await Tournament.update(
            { status: "COMPLETED" },
            {
                where: {
                    status: "ACTIVE",
                    endTime: { [Op.lte]: now }
                }
            }
        );
        console.log("->Tournament cron executed");
    } catch (err) {
        console.error("Tournament cron error:", err.message);
    }
});
