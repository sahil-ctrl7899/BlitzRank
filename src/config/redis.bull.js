import IORedis from "ioredis";

const bullRedis = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null // REQUIRED for BullMQ
});

bullRedis.on("connect", () => {
    console.log("BullMQ Redis connected");
});

bullRedis.on("error", (err) => {
    console.error("BullMQ Redis error:", err);
});

export default bullRedis;
