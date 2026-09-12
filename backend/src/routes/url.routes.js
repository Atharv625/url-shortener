const express = require("express");
const crypto = require("crypto");

const { sql } = require("../config/db");
const { rateLimiter } = require("../config/redis");

const router = express.Router();


// Generate unpredictable short code
function generateShortCode() {
    return crypto.randomBytes(6).toString("base64url");
}


// Create short URL
router.post("/api/shorten", rateLimiter, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                error: "URL is required"
            });
        }

        // Generate random code
        const code = generateShortCode();

        // Store URL
        await sql`
            INSERT INTO urls (
                short_code,
                original_url
            )
            VALUES (
                ${code},
                ${url}
            )
        `;

        res.json({
            shortUrl: `${process.env.BASE_URL}/${code}`
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});


// Redirect
router.get("/:code", async (req, res) => {
    try {
        const { code } = req.params;

        const result = await sql`
            SELECT original_url
            FROM urls
            WHERE short_code = ${code}
        `;

        if (result.length === 0) {
            return res.status(404).send("URL not found");
        }

        res.redirect(result[0].original_url);

    } catch (error) {
        console.error(error);

        res.status(500).send("Internal server error");
    }
});


module.exports = router;