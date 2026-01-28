//=======================================
// File: pointsController.js
// Controller to handle points updates
//=======================================

const express = require("express");
const router = express.Router();

/**
 * Creates and configures the router for points-related routes.
 * @param {object} sql - The database client instance.
 * @returns {object} The configured Express router.
 */
const pointsController = (sql) => {
  // POST /points/update
  // Updates a user's points
  router.post("/update", async (req, res) => {
    try {
      const { email, pointsToAdd } = req.body;

      if (!email || pointsToAdd === undefined) {
        return res.status(400).json({
          error: "Email and pointsToAdd are required",
        });
      }

      // ✅ SECURITY: Verify that the authenticated user can only update their own points
      // (or is an admin - to be implemented if necessary)
      const authenticatedEmail = req.user?.email;
      if (authenticatedEmail !== email) {
        return res.status(403).json({
          error: "Unauthorized: you can only update your own points",
        });
      }

      // Verify that the user exists
      const user = await sql`
                SELECT id, email, punti 
                FROM utenti 
                WHERE email = ${email}
            `;

      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Calculate new points (ensuring they don't go below zero)
      const currentPoints = user[0].punti || 0;
      const newPoints = Math.max(0, currentPoints + pointsToAdd);

      // Update points in the database
      await sql`
                UPDATE utenti 
                SET punti = ${newPoints} 
                WHERE email = ${email}
            `;

      console.log(
        `[POINTS] ${email}: ${currentPoints} + ${pointsToAdd} = ${newPoints}`
      );

      res.json({
        success: true,
        email,
        previousPoints: currentPoints,
        pointsAdded: pointsToAdd,
        newPoints: newPoints,
      });
    } catch (err) {
      console.error("[POINTS] Error updating points:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /points/:email
  // Gets the current points of a user
  router.get("/:email", async (req, res) => {
    try {
      const { email } = req.params;

      const user = await sql`
                SELECT email, punti 
                FROM utenti 
                WHERE email = ${email}
            `;

      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        email: user[0].email,
        punti: user[0].punti || 0,
      });
    } catch (err) {
      console.error("[POINTS] Error reading points:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};

module.exports = pointsController;
