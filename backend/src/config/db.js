require("dotenv").config();

const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL);

async function testConnection() {
    try {
        const result = await sql`SELECT NOW()`;

        console.log("✅ Database connected");
        console.log("Database time:", result[0].now);
    } catch (error) {
        console.error("❌ Database connection failed");
        console.error(error.message);
    }
}

module.exports = {
    sql,
    testConnection
};