require("dotenv").config();

const express = require("express");
const cors = require("cors");
const urlRouter = require("./routes/url.routes");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createClient } = require("redis");
const { sql, testConnection } = require("./config/db");

testConnection();

const app = express();

app.use(express.json());
app.use(cors());
const redisClient=createClient({
    url:process.env.REDIS_URL
})

app.use("/", urlRouter);
const PORT=process.env.PORT||3000
app.listen(PORT,"0.0.0.0", () => {
    console.log(`server running on port ${PORT}`);
});