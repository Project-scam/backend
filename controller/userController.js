const express = require("express");
const router = express.Router();


/**
 * Creates and configures the router for user-related routes.
 * @param {object} sql - The database client instance (e.g. neon).
 * @returns {object} The configured Express router.
 */
const userController = (sql) => {
  // Read all users (with safe and ordered fields)
  router.get("/", async (req, res) => {
    try {
      // Select only safe and useful fields, ordered by points.
      const utenti =
        await sql`SELECT id, username, punti, stato FROM utenti ORDER BY punti DESC`;
      res.json(utenti);
      console.log(res.utenti);
    } catch (err) {
      console.error("Error querying users:", err);
      res.status(500).json({ error: "Error reading users table" });
    }
  });

  return router;
};

module.exports = userController;
