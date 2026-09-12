require("dotenv").config();

const express = require("express");
const urlRouter = require("./routes/url.routes");

const { sql, testConnection } = require("./config/db");

testConnection();

const app = express();

app.use(express.json());

app.use("/", urlRouter);
const PORT=process.env.PORT||3000
app.listen(PORT,"0.0.0.0", () => {
    console.log("server running on port 3000");
});