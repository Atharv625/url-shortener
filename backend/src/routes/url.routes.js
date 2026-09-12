const express = require("express");
const { sql } = require("../config/db");

const {
    encodeBase62,
    decodeBase62
} = require("../utils/base62");

const {
    obfuscate,
    deobfuscate
} = require("../utils/obfuscation");

const router = express.Router();


// Create short URL
router.post("/api/shorten", async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                error: "URL is required"
            });
        }

        // 1. Get next PostgreSQL ID
        const result = await sql`
            SELECT nextval('public.urls_id_seq') AS id
        `;

        const id = Number(result[0].id);

        // 2. Obfuscate ID
        const obfuscatedId = obfuscate(id);

        // 3. Convert obfuscated ID to Base62
        const code = encodeBase62(obfuscatedId);

        // 4. Insert complete record
        await sql`
            INSERT INTO urls (
                id,
                short_code,
                original_url
            )
            VALUES (
                ${id},
                ${code},
                ${url}
            )
        `;

        res.json({
            shortUrl: `http://localhost:3000/${code}`
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

        // 1. Base62 → number
        const obfuscatedId = decodeBase62(code);

        // 2. Reverse obfuscation
        const id = deobfuscate(obfuscatedId);

        // 3. Find original URL
        const result = await sql`
            SELECT original_url
            FROM urls
            WHERE id = ${id}
        `;

        if (result.length === 0) {
            return res.status(404).send("URL not found");
        }

        // 4. Redirect
        res.redirect(result[0].original_url);

    } catch (error) {
        console.error(error);

        res.status(404).send("Invalid short URL");
    }
});


module.exports = router;