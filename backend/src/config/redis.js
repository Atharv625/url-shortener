const { createClient } = require("redis");
const { RedisStore } = require("rate-limit-redis");
const { rateLimit } = require("express-rate-limit");

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on("error", (err) => {
    console.error("Redis Error:", err);
});

redisClient.connect()
    .then(() => {
        console.log("Redis connected");
    })
    .catch((err) => {
        console.error("Redis connection failed:", err);
    });

const rateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 10,           // 10 requests per minute

    standardHeaders: "draft-7",
    legacyHeaders: false,

    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args)
    }),

    message: {
        error: "Too many requests. Please try again later."
    }
});

module.exports = {
    redisClient,
    rateLimiter
};