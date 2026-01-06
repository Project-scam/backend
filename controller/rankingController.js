//=======================================
// File: rankingController.js
// Script that retrieves the ranking
// @author: "catalin.groppo@allievi.itsdigitalacademy.com"
//           mattia.zara@allievi.itsdigitalacademy.com"
//           sandu.batrincea@allievi.itsdigitalacademy.com"
//           andrea.villari@allievi.itsdigitalacademy.com"
// @version: "1.0.0.0 2025-30-12"
//=======================================

const express = require("express");
const router = express.Router();

/**
 * Creates and configures the router for the ranking route.
 * @param {object} sql - The database client instance.
 * @returns {object} The configured Express router.
 */
const rankingController = (sql) => {
    // GET /ranking
    router.get("/", async (req, res) => {
        console.log("[RANKING] Ranking request received");

        try {
            // Select username and points, ordered by descending points
            const classifica = await sql`
                SELECT username, punti 
                FROM utenti 
                ORDER BY punti DESC 
                LIMIT 50
            `;
            res.json(classifica);
        } catch (err) {
            console.error("[RANKING] Query error:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    return router;
};

module.exports = rankingController;
